// Integration acceptance. Run only against a disposable localhost database and API.
const assert = require('node:assert/strict');
const { randomUUID, randomBytes, createHmac } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const { JwtService } = require('@nestjs/jwt');
const Redis = require('ioredis');
const { replay } = require('./replay-letter-privacy.cjs');

// Disconnect only this test client. The Redis instance remains available to other apps.
async function checkQuotaRecovery(namespace) {
  const net = require('node:net');
  const { once } = require('node:events');
  const { ConfigService } = require('@nestjs/config');
  const { LetterQuota } = require('../dist/src/letters/letter-quota');
  let online = false;
  const proxy = net.createServer((socket) => {
    if (!online) {
      socket.destroy();
      return;
    }
    const upstream = net.connect(
      Number(process.env.REDIS_PORT),
      process.env.REDIS_HOST,
    );
    socket.on('error', () => upstream.destroy());
    upstream.on('error', () => socket.destroy());
    socket.on('close', () => upstream.destroy());
    upstream.on('close', () => socket.destroy());
    socket.pipe(upstream).pipe(socket);
  });
  proxy.listen(0, '127.0.0.1');
  await once(proxy, 'listening');
  const quota = new LetterQuota(
    new ConfigService({
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: proxy.address().port,
      LETTERS_QUOTA_NAMESPACE: namespace + '-recovery',
      LETTERS_GLOBAL_PER_10M: 1,
    }),
  );
  try {
    await assert.rejects(
      quota.take(randomUUID()),
      (err) => err.getStatus() === 503,
    );
    online = true;
    await quota.take(randomUUID());
    await assert.rejects(
      quota.take(randomUUID()),
      (err) => err.getStatus() === 429,
    );
  } finally {
    quota.onModuleDestroy();
    await new Promise((resolve) => proxy.close(resolve));
  }
}

async function check() {
  const url = new URL(process.env.DATABASE_URL);
  const name = url.pathname.slice(1);
  const namespace = process.env.LETTERS_QUOTA_NAMESPACE;
  assert(
    ['localhost', '127.0.0.1'].includes(url.hostname) &&
      /^studyv3_[a-z0-9_]+$/.test(name),
  );
  assert(
    namespace?.startsWith('studyv3-') &&
      process.env.NODE_ENV === 'study-preview',
  );
  const db = new PrismaClient();
  const client = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD || undefined,
  });
  const prefix = 'http://127.0.0.1:' + Number(process.env.PORT) + '/v1/';
  const make = (allowPublic) => ({
    id: randomUUID(),
    startedAt: Date.now(),
    claimDigest: randomBytes(32).toString('hex'),
    nickname: '书房试寄',
    email: 'Study-' + randomUUID() + '@example.test',
    body: '只用于本机验收。',
    phone: '',
    topic: 'general',
    allowPublic,
  });
  const first = make(false),
    second = make(true),
    third = make(true);
  const accountIds = [];
  const quotaKey =
    'letters:q:ip:' +
    createHmac('sha256', Buffer.from(process.env.LETTERS_INDEX_KEY, 'hex'))
      .update('source\0' + '127.0.0.1')
      .digest('hex');
  async function request(path, method = 'GET', data, token) {
    return fetch(prefix + path, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  }
  async function status(expected, response) {
    const res = await response;
    assert.equal(
      res.status,
      expected,
      'Unexpected status for ' + new URL(res.url).pathname,
    );
    return res;
  }
  const submit = (data) => request('public/letters', 'POST', data);
  const list = async () =>
    (await (await request('public/letters')).json()).items;
  async function account(role) {
    const user = await db.user.create({
      data: {
        email: randomUUID() + '@example.test',
        name: '验收',
        password: 'disabled',
        role,
      },
    });
    accountIds.push(user.id);
    return new JwtService({ secret: process.env.JWT_SECRET }).sign(
      { sub: user.id, email: user.email },
      { expiresIn: '10m' },
    );
  }
  const backup = process.argv.includes('--wsl-restore');
  const restoreName = 'studyv3_restore_' + Date.now();
  const file = '/tmp/' + restoreName + '.dump';
  const pg = (...args) =>
    execFileSync('wsl.exe', ['-d', 'Ubuntu', '-u', 'postgres', '--', ...args], {
      stdio: 'pipe',
    });
  try {
    await client.del(quotaKey, 'letters:q:all:' + namespace);
    await client.del('letters:q:all:' + namespace + '-recovery');
    await checkQuotaRecovery(namespace);
    const admin = await account('ADMIN'),
      viewer = await account('VIEWER');
    const review = (letter, action) =>
      request('admin/letters/' + letter.id, 'PATCH', { action }, admin);
    const remove = (letter) =>
      request('admin/letters/' + letter.id, 'DELETE', undefined, admin);
    await status(401, request('admin/letters/search', 'POST', {}));
    await status(403, request('admin/letters/search', 'POST', {}, viewer));
    assert.ok((await request('users', 'POST', {}, viewer)).status === 403);
    await status(400, submit({ ...first, email: '' }));
    await Promise.all([status(201, submit(first)), status(201, submit(first))]);
    assert.equal(await db.studyLetter.count({ where: { id: first.id } }), 1);
    await status(409, submit({ ...first, allowPublic: true }));
    await status(409, review(first, 'publish'));
    await status(201, submit(second));
    await status(201, submit(third));
    const limited = await status(429, submit(make(false)));
    assert(Number(limited.headers.get('retry-after')) > 0);
    await status(201, submit(first));
    const found = await (
      await status(
        201,
        request('admin/letters/search', 'POST', { email: first.email }, admin),
      )
    ).json();
    assert.equal(found.length, 1);
    assert(!('contact' in found[0]) && !('email' in found[0]));
    const privateRow = await db.studyLetter.findUniqueOrThrow({
      where: { id: first.id },
    });
    assert(!privateRow.contact.includes(first.email));
    const details = await (
      await status(
        200,
        request('admin/letters/' + first.id, 'GET', undefined, admin),
      )
    ).json();
    assert.equal(details.email, first.email);
    await status(200, review(first, 'read'));
    await status(200, review(first, 'handled'));
    assert(!(await list()).some((row) => row.nickname === first.nickname));
    await status(200, review(second, 'publish'));
    await status(200, review(third, 'decline'));
    const published = (await list()).find(
      (row) => row.nickname === second.nickname,
    );
    assert(published);
    assert.deepEqual(Object.keys(published).sort(), [
      'body',
      'nickname',
      'publicId',
      'publishedAt',
    ]);
    if (backup) pg('pg_dump', '-Fc', '-f', file, name);
    await status(200, review(second, 'withdraw'));
    await status(409, review(second, 'publish'));
    await status(200, remove(first));
    await status(410, submit(first));
    assert(!(await list()).some((row) => row.publicId === published.publicId));
    assert.equal(
      (await db.studyLetter.findUniqueOrThrow({ where: { id: first.id } }))
        .contact,
      null,
    );
    if (backup) {
      const owner = decodeURIComponent(url.username);
      pg('createdb', '-O', owner, restoreName);
      pg('pg_restore', '--exit-on-error', '-d', restoreName, file);
      url.pathname = '/' + restoreName;
      const restored = new PrismaClient({ datasourceUrl: url.toString() });
      try {
        assert.equal(
          (
            await restored.studyLetter.findUniqueOrThrow({
              where: { id: second.id },
            })
          ).status,
          'published',
        );
        for (let pass = 0; pass < 2; pass++)
          await replay(restored, process.env.LETTERS_PRIVACY_JOURNAL);
        assert.equal(
          (
            await restored.studyLetter.findUniqueOrThrow({
              where: { id: second.id },
            })
          ).status,
          'withdrawn',
        );
        const deleted = await restored.studyLetter.findUniqueOrThrow({
          where: { id: first.id },
        });
        for (const key of [
          'contact',
          'body',
          'nickname',
          'fingerprint',
          'emailKey',
          'claimDigest',
        ])
          assert.equal(deleted[key], null);
      } finally {
        await restored.$disconnect();
        pg('dropdb', restoreName);
        pg('unlink', file);
      }
    }
    const publishedAt = new Date(Date.now() + 1000);
    const fixtures = Array.from({ length: 21 }, () => ({
      id: randomUUID(),
      nickname: '分页试寄',
      body: '分页',
      allowPublic: true,
      status: 'published',
      publishedAt,
    }));
    try {
      await db.studyLetter.createMany({ data: fixtures });
      const page = await (await request('public/letters')).json();
      assert.equal(page.items.length, 20);
      assert.ok(page.next);
      const more = await (
        await request('public/letters?cursor=' + encodeURIComponent(page.next))
      ).json();
      const ids = [...page.items, ...more.items]
        .filter((row) => row.nickname === '分页试寄')
        .map((row) => row.publicId);
      assert.equal(new Set(ids).size, 21);
    } finally {
      await db.studyLetter.deleteMany({
        where: { id: { in: fixtures.map((row) => row.id) } },
      });
    }
    await status(200, remove(second));
    await status(200, remove(third));
    console.log(
      'Passed delivery, replay, consent, quota, authorization, contact isolation, moderation, withdrawal and deletion checks.' +
        (backup
          ? ' PostgreSQL dump, restore and double privacy replay passed.'
          : ''),
    );
  } finally {
    await db.user.deleteMany({ where: { id: { in: accountIds } } });
    await client.del(quotaKey, 'letters:q:all:' + namespace);
    client.disconnect();
    await db.$disconnect();
  }
}
check().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
