// Run against an offline restored database before switching traffic to it.
const { createReadStream } = require('node:fs');
const { createInterface } = require('node:readline');
const { PrismaClient } = require('@prisma/client');

async function replay(db, path) {
  if (!path) throw new Error('LETTERS_PRIVACY_JOURNAL is required');
  const stream = createReadStream(path, { encoding: 'utf8' });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  let count = 0;
  for await (const line of lines) {
    const { id, action, at } = JSON.parse(line);
    const date = new Date(at);
    if (
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) ||
      !['withdraw', 'delete'].includes(action) ||
      date.toISOString() !== at
    ) {
      throw new Error('Invalid privacy journal record on line ' + (count + 1));
    }
    const tombstone = {
      status: 'deleted',
      deletedAt: date,
      allowPublic: false,
    };
    if (action === 'delete') {
      await db.studyLetter.upsert({
        where: { id },
        create: { id, ...tombstone },
        update: {
          ...tombstone,
          nickname: null,
          body: null,
          topic: null,
          contact: null,
          emailKey: null,
          claimDigest: null,
          visitorId: null,
          fingerprint: null,
          readAt: null,
          handledAt: null,
          reviewedBy: null,
          reviewedAt: null,
          publishedAt: null,
        },
      });
    } else {
      await db.$transaction(async (tx) => {
        const row = await tx.studyLetter.findUnique({
          where: { id },
          select: { deletedAt: true },
        });
        if (!row) await tx.studyLetter.create({ data: { id, ...tombstone } });
        else if (!row.deletedAt)
          await tx.studyLetter.update({
            where: { id },
            data: { status: 'withdrawn', publishedAt: null, reviewedAt: date },
          });
      });
    }
    count++;
  }
  return count;
}
module.exports = { replay };
if (require.main === module) {
  if (!process.env.DATABASE_URL || process.argv[2] !== '--offline-restore')
    throw new Error('Specify DATABASE_URL and --offline-restore');
  const db = new PrismaClient();
  replay(db, process.env.LETTERS_PRIVACY_JOURNAL)
    .then((count) => console.log('Replayed privacy records:', count))
    .catch(() => {
      console.error(
        'Privacy replay incomplete. Keep restored database offline.',
      );
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
