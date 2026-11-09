'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import RoomImprint from './RoomImprint'
import paper from './letter-paper.module.css'

const endpoint = '/api/v1/public/letters'
type Fields = {
  nickname: string
  email: string
  phone: string
  topic: string
  body: string
  allowPublic: boolean
}
type Packet = {
  fields: Fields
  id: string
  startedAt: number
  token: string
  claimDigest: string
}
const empty: Fields = {
  nickname: '',
  email: '',
  phone: '',
  topic: 'general',
  body: '',
  allowPublic: false,
}
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
async function makePacket(fields: Fields): Promise<Packet> {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)))
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  )
  return {
    fields: { ...fields },
    id: crypto.randomUUID(),
    startedAt: Date.now(),
    token,
    claimDigest: hex(new Uint8Array(digest)),
  }
}

type Published = {
  publicId: string
  nickname: string
  body: string
  publishedAt: string
}
function PublicLetters({ en }: { en: boolean }) {
  const [rows, setRows] = useState<Published[]>([])
  const [next, setNext] = useState<string | null>(null)
  const [cursor, setCursor] = useState('')
  const [retry, setRetry] = useState(0)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  useEffect(() => {
    const abort = new AbortController()
    fetch(endpoint + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''), {
      cache: 'no-store',
      signal: abort.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error()
        const result = (await res.json()) as {
          items: Published[]
          next: string | null
        }
        if (!abort.signal.aborted) {
          setRows((old) => (cursor ? [...old, ...result.items] : result.items))
          setNext(result.next)
          setPhase('ready')
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) setPhase('error')
      })
    return () => abort.abort()
  }, [cursor, retry])
  return (
    <section aria-label={en ? 'Published letters' : '大家的来信'}>
      {rows.map((row) => (
        <article className={paper.post} key={row.publicId}>
          <p>{row.body}</p>
          <footer>
            {row.nickname} ·{' '}
            <time dateTime={row.publishedAt}>
              {new Date(row.publishedAt).toLocaleDateString(
                en ? 'en' : 'zh-CN',
              )}
            </time>
          </footer>
        </article>
      ))}
      <p role="status">
        {phase === 'loading'
          ? en
            ? 'Opening the letters…'
            : '正在取信…'
          : phase === 'error'
            ? en
              ? 'The letters could not be loaded.'
              : '来信暂时没取到。'
            : !rows.length
              ? en
                ? 'There are no published letters yet.'
                : '信匣里还没有公开的来信。'
              : ''}
      </p>
      {phase === 'error' && (
        <button onClick={() => {setPhase('loading'); setRetry((n) => n + 1)}}>
          {en ? 'Try again' : '重新取信'}
        </button>
      )}
      {phase === 'ready' && next && (
        <button onClick={() => {setPhase('loading'); setCursor(next)}}>
          {en ? 'Earlier letters' : '更早的来信'}
        </button>
      )}
    </section>
  )
}

export default function LetterPaper({
  locale,
  onClose,
}: {
  locale: string
  onClose?: () => void
}) {
  const en = locale === 'en'
  const [tab, setTab] = useState<'write' | 'read'>('write')
  const [fields, setFields] = useState<Fields>(empty)
  const [phase, setPhase] = useState<
    'draft' | 'sending' | 'uncertain' | 'sent'
  >('draft')
  const [message, setMessage] = useState('')
  const [receipt, setReceipt] = useState('')
  const pending = useRef<Packet | null>(null)
  const sending = useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const dirty =
    phase !== 'sent' &&
    (JSON.stringify(fields) !== JSON.stringify(empty) || phase !== 'draft')
  const discard = en
    ? 'Leave and discard this letter?'
    : '离开并丢弃这封未完成的信？'
  const locked = phase === 'sending' || phase === 'uncertain'
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    element.showModal()
    title.current?.focus()
    return () => element.close()
  }, [])
  useEffect(() => {
    if (!dirty) return
    const leaving = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest?.(
        'a[href]',
      ) as HTMLAnchorElement | null
      if (link && link.target !== '_blank' && !window.confirm(discard)) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }
    window.addEventListener('beforeunload', leaving)
    document.addEventListener('click', navigate, true)
    return () => {
      window.removeEventListener('beforeunload', leaving)
      document.removeEventListener('click', navigate, true)
    }
  }, [dirty, discard])
  function close() {
    if (!dirty || window.confirm(discard)) {
      dialog.current?.close()
      onClose?.()
    }
  }
  function change<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((old) => ({ ...old, [key]: value }))
    pending.current = null
    setMessage('')
  }
  async function send(event: FormEvent) {
    event.preventDefault()
    if (sending.current) return
    sending.current = true
    setPhase('sending')
    setMessage('')
    try {
      const packet = pending.current ?? (await makePacket(fields))
      pending.current = packet
      const { id, startedAt, claimDigest } = packet
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...packet.fields, id, startedAt, claimDigest }),
        signal: AbortSignal.timeout(12000),
      })
      if (response.ok) {
        const result = await response.json()
        if (result.received !== true) throw new Error()
        setReceipt(packet.token)
        pending.current = null
        setPhase('sent')
        setMessage(
          fields.allowPublic
            ? en
              ? 'Received. Your letter can appear after review.'
              : '信已收到，审核通过后可展示。'
            : en
              ? 'Delivered privately to the host.'
              : '已私密寄出，仅博主可查看。',
        )
        setFields(empty)
      } else if (response.status === 429) {
        const info = await response.json().catch(() => ({}))
        const minutes = Math.max(
          1,
          Math.ceil((Number(info.retryAfter) || 600) / 60),
        )
        setMessage(
          en
            ? 'Please try again in ' + minutes + ' min.'
            : '来信较多，请约 ' + minutes + ' 分钟后再寄。',
        )
        setPhase('draft')
      } else if ([400, 409, 410, 413].includes(response.status)) {
        pending.current = null
        setPhase('draft')
        setMessage(
          en
            ? 'Check your letter and confirm a new submission.'
            : '请检查内容，再确认是否重新寄送。',
        )
      } else if (response.status === 503) {
        setPhase('uncertain')
        setMessage(
          en
            ? 'The mailbox is unavailable. Your writing is here; check delivery later.'
            : '寄信通道暂时拥挤，信纸已保留，稍后可确认上次寄送。',
        )
      } else throw new Error()
    } catch {
      setPhase(pending.current ? 'uncertain' : 'draft')
      setMessage(
        en
          ? 'Delivery could not be confirmed. Your writing is still here.'
          : '暂时无法确认是否寄达，已保留这封信。',
      )
    } finally {
      sending.current = false
    }
  }
  const content = (
    <div className={paper.sheet}>
      <header className={paper.heading}>
        <RoomImprint siteName="墨千" />
        {onClose ? (
          <button
            onClick={close}
            aria-label={en ? 'Put the letter back' : '放回信纸'}
          >
            ×
          </button>
        ) : (
          <a href={'/' + locale}>{en ? 'Back to the study' : '返回书房'} ↗</a>
        )}
      </header>
      <h1 ref={title} tabIndex={-1}>
        {tab === 'write'
          ? en
            ? 'Write to the host'
            : '给我写信'
          : en
            ? 'Letters from readers'
            : '大家的来信'}
      </h1>
      <nav className={paper.tabs} aria-label={en ? 'Letter box' : '信匣'}>
        <button aria-pressed={tab === 'write'} onClick={() => setTab('write')}>
          {en ? 'Write a letter' : '写一封信'}
        </button>
        <button aria-pressed={tab === 'read'} onClick={() => setTab('read')}>
          {en ? 'Published letters' : '大家的来信'}
        </button>
      </nav>
      {tab === 'read' ? (
        <PublicLetters en={en} />
      ) : phase === 'sent' ? (
        <section className={paper.delivered}>
          <div className={paper.envelope} aria-hidden="true">
            <i />
          </div>
          <h2 role="status">{message}</h2>
          <details>
            <summary>
              {en ? 'Keep the claim slip' : '保存这封信的认领凭条'}
            </summary>
            <p>
              {en
                ? 'Keep it before leaving. A future verified account may use it to claim this letter.'
                : '离开前可自行保存；将来开通账户后，可配合已验证邮箱认领这封信。'}
            </p>
            <code>{receipt}</code>
          </details>
          <button
            onClick={() => {
              setReceipt('')
              setMessage('')
              setPhase('draft')
            }}
          >
            {en ? 'Write another' : '再写一封'}
          </button>
        </section>
      ) : (
        <form onSubmit={send} className={paper.form}>
          <fieldset disabled={locked}>
            <label>
              {en ? 'Your letter' : '正文'}
              <textarea
                required
                maxLength={3000}
                rows={4}
                value={fields.body}
                onChange={(e) => change('body', e.target.value)}
                placeholder={en ? 'Dear host,' : '展信好，'}
              />
            </label>
            <div className={paper.pair}>
              <label>
                {en ? 'Signed by' : '落款昵称'}
                <input
                  required
                  maxLength={60}
                  autoComplete="nickname"
                  value={fields.nickname}
                  onChange={(e) => change('nickname', e.target.value)}
                />
              </label>
              <label>
                {en ? 'Your email' : '联系邮箱'}
                <input
                  required
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  value={fields.email}
                  onChange={(e) => change('email', e.target.value)}
                />
              </label>
            </div>
            <small>
              {en
                ? 'Only the host sees your contact details.'
                : '邮箱和手机号仅供博主联系。'}
            </small>
            <details>
              <summary>
                {en
                  ? 'Phone and subject (optional)'
                  : '手机号与来信主题（选填）'}
              </summary>
              <div className={paper.pair}>
                <label>
                  {en ? 'Phone' : '手机号'}
                  <input
                    type="tel"
                    maxLength={31}
                    autoComplete="tel"
                    pattern="[+0-9][0-9\s\(\)\-]{4,30}"
                    value={fields.phone}
                    onChange={(e) => change('phone', e.target.value)}
                  />
                </label>
                <label>
                  {en ? 'Subject' : '主题'}
                  <select
                    value={fields.topic}
                    onChange={(e) => change('topic', e.target.value)}
                  >
                    <option value="general">
                      {en ? 'A note' : '一般交流'}
                    </option>
                    <option value="work">
                      {en ? 'Collaboration' : '项目合作'}
                    </option>
                    <option value="other">{en ? 'Other' : '其他'}</option>
                  </select>
                </label>
              </div>
            </details>
            <label className={paper.permission}>
              <input
                type="checkbox"
                checked={fields.allowPublic}
                onChange={(e) => change('allowPublic', e.target.checked)}
              />
              {en
                ? 'Allow my name and letter to appear in Published letters.'
                : '允许我的昵称和正文展示在「大家的来信」。'}
            </label>
            {fields.allowPublic && (
              <small>
                {en
                  ? 'Please leave contact details out of your letter.'
                  : '请确认正文和昵称中没有私人联系方式。'}
              </small>
            )}
          </fieldset>
          <p role="status">{message}</p>
          <button
            className={paper.send}
            disabled={phase === 'sending'}
            type="submit"
          >
            {phase === 'sending'
              ? en
                ? 'Sending…'
                : '正在寄送…'
              : phase === 'uncertain'
                ? en
                  ? 'Check previous delivery'
                  : '确认上次寄送'
                : en
                  ? 'Seal and send'
                  : '封缄寄出'}
          </button>
        </form>
      )}
    </div>
  )
  if (onClose)
    return (
      <dialog
        aria-modal="true"
        ref={dialog}
        aria-label={en ? 'Write to the host' : '给我写信'}
        className={paper.dialog}
        onCancel={(e) => {
          e.preventDefault()
          close()
        }}
      >
        {content}
      </dialog>
    )
  return <main className={paper.page}>{content}</main>
}
