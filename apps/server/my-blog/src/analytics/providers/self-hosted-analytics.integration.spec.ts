import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PrismaService } from '../../prisma';
import { SelfHostedAnalyticsProvider } from './self-hosted-analytics.provider';

const connection = process.env.ENVIRONMENT_INTEGRATION_URL;
const suite = connection ? describe : describe.skip;

suite('analytics collection concurrency in disposable PostgreSQL', () => {
  const schema = 'analytics_test_' + randomUUID().replaceAll('-', '');
  let admin: PrismaClient;
  let db: PrismaClient;
  let provider: SelfHostedAnalyticsProvider;
  const sessionInserts: string[] = [];

  beforeAll(async () => {
    const url = new URL(connection!);
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/environment_test') {
      throw new Error('Use the disposable localhost environment_test database');
    }
    admin = new PrismaClient({ datasources: { db: { url: connection } } });
    await admin.$executeRawUnsafe('CREATE SCHEMA "' + schema + '"');
    url.searchParams.set('schema', schema);
    url.searchParams.set('connection_limit', '8');
    const client = new PrismaClient({
      datasources: { db: { url: url.toString() } },
      log: [{ level: 'query', emit: 'event' }],
    });
    client.$on('query', (event) => {
      if (/INSERT INTO .*"analytics_sessions"/.test(event.query)) sessionInserts.push(event.query);
    });
    db = client;
    const migration = await readFile(
      resolve(__dirname, '../../../prisma/migrations/20260530120000_add_analytics_tracking/migration.sql'),
      'utf8',
    );
    for (const statement of migration.split(';').map((sql) => sql.trim()).filter(Boolean)) {
      await db.$executeRawUnsafe(statement);
    }
    provider = new SelfHostedAnalyticsProvider(db as PrismaService);
  }, 30000);

  afterAll(async () => {
    await db?.$disconnect();
    if (admin) {
      try {
        await admin.$executeRawUnsafe('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
      } finally {
        await admin.$disconnect();
      }
    }
  });

  it('stores 32 concurrent first events in one session using atomic upserts and preserves first-visit metadata', async () => {
    const context = { ip: '192.0.2.1', userAgent: 'Mozilla/5.0 analytics-concurrency-test' };
    const firstEvent = { type: 'custom' as const, url: '/zh/posts/test', locale: 'zh', referrer: 'https://first.example/article' };
    const outcomes = await Promise.allSettled(
      Array.from({ length: 32 }, (_, index) => provider.collect({ ...firstEvent, name: 'event-' + index }, context)),
    );
    expect(outcomes.filter((result) => result.status === 'rejected')).toEqual([]);
    expect(sessionInserts).toHaveLength(32);
    expect(sessionInserts.every((sql) => sql.includes('ON CONFLICT ("visitorId") DO UPDATE'))).toBe(true);

    const sessions = await db.analyticsSession.findMany({ include: { events: true } });
    expect(sessions).toHaveLength(1);
    const session = sessions[0];
    expect(session.events).toHaveLength(32);
    expect(new Set(session.events.map((event) => event.eventName)).size).toBe(32);
    expect(session).toMatchObject({ language: 'zh', referrer: 'first.example' });

    await provider.collect({ ...firstEvent, name: 'after-first-burst', locale: 'en', referrer: 'https://later.example' }, context);
    expect(await db.analyticsSession.count()).toBe(1);
    expect(await db.analyticsSession.findUnique({ where: { id: session.id } })).toMatchObject({
      date: session.date, createdAt: session.createdAt, language: 'zh', referrer: 'first.example',
    });
    expect(await db.analyticsEvent.count()).toBe(33);
  }, 30000);
});
