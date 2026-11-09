export const environmentMigration = '20261105140000_environment_config'
export const lettersMigration = '20261108180000_study_letters'
export function checkLetterSchema(previous, candidate) {
  const model = /^model StudyLetter\s*\{[^}]+\}\s*/gm
  const normalize = text => text.replace(/\r/g, '').trim()
  const blocks = candidate.match(model)
  if (blocks?.length !== 1 || !blocks[0].includes('@@map("study_letters")') ||
      normalize(previous.replace(model, '')) !== normalize(candidate.replace(model, ''))) {
    throw Error('The letters release may only add the study_letters model')
  }
}
export function checkEnvironmentSchema(previous, candidate) {
  const model = /model EnvironmentConfig\s*\{[^}]*\}\s*/g
  const normalize = text => text.replace(/\r/g, '').trim()
  if (!candidate.includes('model EnvironmentConfig') || normalize(previous.replace(model, '')) !== normalize(candidate.replace(model, ''))) throw Error('V2 release may only add EnvironmentConfig; unrelated schema changes require a separate release')
}
export function checkPendingMigrations(names, history, allowed = environmentMigration) {
  if (history.some(row => !row.finished_at && !row.rolled_back_at)) throw Error('Unresolved database migration; stop release')
  const applied = new Set(history.filter(row => row.finished_at && !row.rolled_back_at).map(row => row.migration_name))
  const pending = names.filter(name => !applied.has(name))
  if (pending.some(name => name !== allowed)) throw Error('Unrelated pending migrations; stop release')
  return pending
}
