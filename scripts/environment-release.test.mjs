import test from 'node:test'
import assert from 'node:assert/strict'
import { checkEnvironmentSchema, checkPendingMigrations, environmentMigration } from './environment-release-policy.mjs'
test('permits only the additive environment model', () => {
  const base = 'model User { id String @id }'
  const candidate = 'model EnvironmentConfig { id String @id }\n'+base
  checkEnvironmentSchema(base, candidate)
  checkEnvironmentSchema(candidate, candidate)
  assert.throws(() => checkEnvironmentSchema(base, candidate.replace('User', 'Article')))
  assert.throws(() => checkEnvironmentSchema(base, base))
})
test('rejects unrelated or failed migrations, allows an already applied environment migration', () => {
  const history = [{ migration_name: 'baseline', finished_at: new Date(), rolled_back_at: null }]
  assert.deepEqual(checkPendingMigrations(['baseline', environmentMigration], history), [environmentMigration])
  assert.throws(() => checkPendingMigrations(['baseline','unexpected',environmentMigration], history))
  assert.throws(() => checkPendingMigrations([environmentMigration], [{ migration_name:'failed', finished_at:null, rolled_back_at:null }]))
  assert.deepEqual(checkPendingMigrations([environmentMigration], [{ migration_name:environmentMigration, finished_at:new Date(), rolled_back_at:null }]), [])
})
