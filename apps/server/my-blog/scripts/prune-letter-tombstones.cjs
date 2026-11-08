// Run after the oldest recoverable backup and the 24h submission window have expired.
const { PrismaClient } = require('@prisma/client');
const days = Number(process.env.LETTERS_BACKUP_RETENTION_DAYS);
if (!process.env.DATABASE_URL || !Number.isSafeInteger(days) || days < 2) {
  throw new Error(
    'Set the verified backup retention in whole days (at least two).',
  );
}
const db = new PrismaClient();
const where = {
  status: 'deleted',
  deletedAt: { lt: new Date(Date.now() - days * 86400000) },
};
async function run() {
  if (process.argv[2] === '--apply')
    console.log(
      'Expired tombstones removed:',
      (await db.studyLetter.deleteMany({ where })).count,
    );
  else
    console.log(
      'Expired tombstones eligible for removal:',
      await db.studyLetter.count({ where }),
    );
}
run()
  .catch(() => {
    process.exitCode = 1;
    console.error('Tombstone maintenance failed.');
  })
  .finally(() => db.$disconnect());
