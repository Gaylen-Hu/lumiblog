export const environmentMigration = '20261105140000_environment_config'
export function checkEnvironmentSchema(previous, candidate) {
  const model = /model EnvironmentConfig\s*\{[^}]*\}\s*/g
  const normalize = text => text.replace(/\r/g, '').trim()
  if (!candidate.includes('model EnvironmentConfig') || normalize(previous.replace(model, '')) !== normalize(candidate.replace(model, ''))) throw Error('V2 release may only add EnvironmentConfig; unrelated schema changes require a separate release')
}
export function checkPendingMigrations(names, history) {
  if (history.some(row => !row.finished_at && !row.rolled_back_at)) throw Error('Unresolved database migration; stop release')
  const applied = new Set(history.filter(row => row.finished_at && !row.rolled_back_at).map(row => row.migration_name))
  const pending = names.filter(name => !applied.has(name))
  if (pending.some(name => name !== environmentMigration)) throw Error('Unrelated pending migrations; stop release')
  return pending
}
