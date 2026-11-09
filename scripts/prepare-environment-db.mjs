import { readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { parseEnv } from 'node:util'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { checkEnvironmentSchema, checkLetterSchema, checkPendingMigrations, lettersMigration } from './environment-release-policy.mjs'

const [previous, release, backup] = process.argv.slice(2)
if (!previous || !release || !backup) throw Error('Expected previous release, candidate release, private backup file')
const letters = process.env.RELEASE_LETTERS === 'true'
const checkSchema = letters ? checkLetterSchema : checkEnvironmentSchema
checkSchema(readFileSync(resolve(previous, 'prisma/schema.prisma'), 'utf8'), readFileSync(resolve(release, 'prisma/schema.prisma'), 'utf8'))
if (letters) {
  const sql = readFileSync(resolve(release, 'prisma/migrations', lettersMigration, 'migration.sql'), 'utf8').replace(/\r\n/g, '\n')
  if (createHash('sha256').update(sql).digest('hex') !== '700c91489312b9848b9cf49109dcc411feeec1ec8ecc76191de527f44f34dec3') throw Error('Unexpected changes to the reviewed letters SQL')
}
const require = createRequire(resolve(release, 'package.json'))
const config = parseEnv(readFileSync(resolve(release, '.env'), 'utf8'))
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient({ datasources: { db: { url: config.DATABASE_URL } } })
try {
  const history = await db.$queryRawUnsafe('SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"')
  const names = readdirSync(resolve(release, 'prisma/migrations'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name)
  const pending = checkPendingMigrations(names, history, letters ? lettersMigration : undefined)
  const url = new URL(config.DATABASE_URL)
  const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432', PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGSSLMODE: url.searchParams.get('sslmode') || 'prefer' }
  // Credentials are passed through environment, never command arguments or logs.
  execFileSync('pg_dump', ['--no-password', '--format=custom', '--file', backup], { env, stdio: ['ignore', 'ignore', 'pipe'] })
  if (statSync(backup).size < 100) throw Error('Database backup is incomplete')
  execFileSync('pg_restore', ['--list', backup], { stdio: 'ignore' })
  console.log('Database backup verified; pending migrations:', pending.length)
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], { cwd: release, env: { ...process.env, DATABASE_URL: config.DATABASE_URL }, stdio: ['ignore', 'pipe', 'pipe'] })
  await db.environmentConfig.count()
  if (letters) {
    const { prepareLetterSettings } = await import('./prepare-letter-settings.mjs')
    prepareLetterSettings(config, await db.studyLetter.count())
  }
  console.log('Release schema and settings ready')
} catch {
  // Do not leak connection strings or provider credentials via nested CLI errors.
  console.error('Database or settings preparation failed; the production service has not been switched. Inspect migration state, mailbox configuration and backup privately.')
  process.exitCode = 1
} finally { await db.$disconnect() }
