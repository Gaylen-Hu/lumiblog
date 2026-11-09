import { randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

const settingsPath = '/etc/myblog/letters.env'
const journalDirectory = '/var/lib/myblog-letters'
const defaultJournal = journalDirectory + '/privacy.jsonl'

export function mailboxSettings(base, saved, count) {
  const result = {}
  for (const source of [base, saved]) {
    for (const [name, value] of Object.entries(source)) {
      if (!/^LETTERS_(?:INDEX_KEY|KEY_VERSION|CONTACT_KEY_\d+|PRIVACY_JOURNAL|QUOTA_NAMESPACE)$/.test(name)) continue
      if (name in result && result[name] !== value) throw Error('Conflicting existing mailbox settings')
      result[name] = value
    }
  }
  const active = result.LETTERS_KEY_VERSION ?? '1'
  const contactKey = 'LETTERS_CONTACT_KEY_' + active
  if (!/^\d{1,3}$/.test(active)) throw Error('Invalid active mailbox key version')
  if (!('LETTERS_INDEX_KEY' in result) && !Object.keys(result).some(key => key.startsWith('LETTERS_CONTACT_KEY_'))) {
    if (count || Object.keys(saved).length) throw Error('Existing mailbox requires original keys')
    result.LETTERS_INDEX_KEY = randomBytes(32).toString('hex')
    result[contactKey] = randomBytes(32).toString('hex')
  }
  const keys = Object.entries(result).filter(([name]) => name === 'LETTERS_INDEX_KEY' || name.startsWith('LETTERS_CONTACT_KEY_'))
  if (!(contactKey in result) || !result.LETTERS_INDEX_KEY ||
      keys.some(([, key]) => !/^[a-f\d]{64}$/i.test(key)) ||
      new Set(keys.map(([, key]) => key.toLowerCase())).size !== keys.length) throw Error('Invalid or incomplete mailbox keys')
  result.LETTERS_KEY_VERSION = active
  result.LETTERS_PRIVACY_JOURNAL ??= defaultJournal
  result.LETTERS_QUOTA_NAMESPACE ??= 'production'
  if (!/^\/[\w.\-/]+$/.test(result.LETTERS_PRIVACY_JOURNAL) || !/^[\w.-]+$/.test(result.LETTERS_QUOTA_NAMESPACE)) throw Error('Invalid mailbox journal or quota namespace')
  return result
}

export function prepareLetterSettings(base, count) {
  mkdirSync('/etc/myblog', { recursive: true, mode: 0o700 })
  const hasSettings = existsSync(settingsPath)
  if (hasSettings && !lstatSync(settingsPath).isFile()) throw Error('Mailbox settings must be a regular file')
  const saved = hasSettings ? parseEnv(readFileSync(settingsPath, 'utf8')) : {}
  if (hasSettings && !Object.keys(saved).length) throw Error('Existing mailbox settings are empty')
  const settings = mailboxSettings(base, saved, count)
  if (hasSettings && !saved.LETTERS_PRIVACY_JOURNAL && !base.LETTERS_PRIVACY_JOURNAL) throw Error('Existing configuration is missing the journal path')
  const journal = settings.LETTERS_PRIVACY_JOURNAL
  if (journal === defaultJournal) execFileSync('install', ['-d', '-m', '0750', '-o', 'root', '-g', 'myblog', journalDirectory])
  if (!existsSync(journal)) {
    if (count || journal !== defaultJournal) throw Error('Expected existing privacy journal')
    execFileSync('install', ['-m', '0600', '-o', 'myblog', '-g', 'myblog', '/dev/null', journal])
  }
  if (!lstatSync(journal).isFile()) throw Error('Expected regular privacy journal')
  execFileSync('runuser', ['-u', 'myblog', '--', 'test', '-w', journal])
  const body = Object.entries(settings).map(([name, value]) => name + '=' + value).join('\n') + '\n'
  if (!hasSettings) writeFileSync(settingsPath, body, { mode: 0o600, flag: 'wx', flush: true })
  chmodSync(settingsPath, 0o600)
  // Retain an independent, root-only snapshot for offline recovery. Never put
  // the journal or keys in a release artifact or in the database dump.
  mkdirSync('/var/backups/myblog-letters', { recursive: true, mode: 0o700 })
  const snapshot = mkdtempSync('/var/backups/myblog-letters/release-')
  writeFileSync(snapshot + '/letters.env', body, { flag: 'wx', mode: 0o600, flush: true })
  copyFileSync(journal, snapshot + '/privacy.jsonl')
  chmodSync(snapshot + '/privacy.jsonl', 0o600)
}
