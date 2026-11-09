import test from 'node:test'
import assert from 'node:assert/strict'
import { checkEnvironmentSchema, checkLetterSchema, checkPendingMigrations, environmentMigration, lettersMigration } from './environment-release-policy.mjs'
import { mailboxSettings } from './prepare-letter-settings.mjs'
test('permits only the additive environment model', () => {
  const base = 'model User { id String @id }'
  const candidate = 'model EnvironmentConfig { id String @id }\n'+base
  checkEnvironmentSchema(base, candidate)
  checkEnvironmentSchema(candidate, candidate)
  assert.throws(() => checkEnvironmentSchema(base, candidate.replace('User', 'Article')))
  assert.throws(() => checkEnvironmentSchema(base, base))
})

test('letters release requires exactly its additive model and only its own pending migration', () => {
  const base = 'model User { id String @id }'
  const candidate = 'model StudyLetter { id String @id @@map("study_letters") }\n' + base
  checkLetterSchema(base, candidate)
  checkLetterSchema(candidate, candidate)
  assert.throws(() => checkLetterSchema(base, candidate.replace('User', 'Other')))
  assert.throws(() => checkLetterSchema(base, base))
  assert.deepEqual(checkPendingMigrations([lettersMigration], [], lettersMigration), [lettersMigration])
  assert.throws(() => checkPendingMigrations([environmentMigration, lettersMigration], [], lettersMigration))
  assert.throws(() => checkPendingMigrations([lettersMigration], []))
})

test('a new mailbox gets independent keys, retries keep originals, missing keys cannot replace a nonempty mailbox', () => {
  const fresh = mailboxSettings({}, {}, 0)
  assert.notEqual(fresh.LETTERS_INDEX_KEY, fresh.LETTERS_CONTACT_KEY_1)
  assert.deepEqual(mailboxSettings({}, fresh, 12), fresh)
  assert.deepEqual(mailboxSettings(fresh, {}, 12), fresh)
  assert.throws(() => mailboxSettings({}, {}, 12))
  assert.throws(() => mailboxSettings({ LETTERS_INDEX_KEY: fresh.LETTERS_INDEX_KEY }, {}, 0))
  assert.throws(() => mailboxSettings({ LETTERS_KEY_VERSION: '2' }, fresh, 2))
})
test('rejects unrelated or failed migrations, allows an already applied environment migration', () => {
  const history = [{ migration_name: 'baseline', finished_at: new Date(), rolled_back_at: null }]
  assert.deepEqual(checkPendingMigrations(['baseline', environmentMigration], history), [environmentMigration])
  assert.throws(() => checkPendingMigrations(['baseline','unexpected',environmentMigration], history))
  assert.throws(() => checkPendingMigrations([environmentMigration], [{ migration_name:'failed', finished_at:null, rolled_back_at:null }]))
  assert.deepEqual(checkPendingMigrations([environmentMigration], [{ migration_name:environmentMigration, finished_at:new Date(), rolled_back_at:null }]), [])
})
