'use client'

import { useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import LetterPaper, { type LetterDraftFields } from '../study/LetterPaper'
import { LetterDeliveryContext, type LetterReceipt } from '../study/LetterDelivery'
import { getArticleCommentElement, getWebsiteContext, hasArticleComments, subscribeWebsiteContext, type WebsiteArticle } from './website-context'
import styles from './website-drafts.module.css'

type Kind = 'letter' | 'comment'
// Contacts entered on the letter paper stay in this private in-memory draft.
// Neither the agent context nor capability API can read this store.
type Draft = { id: string; kind: Kind; text: string; article?: WebsiteArticle; letterFields?: LetterDraftFields }
let draft: Draft | null = null
const listeners = new Set<() => void>()
const snapshot = () => draft
const serverSnapshot = () => null
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
function update(value: Draft | null) { draft = value; for (const listener of listeners) listener() }

export function getDraftCapabilities(): Kind[] {
  return typeof window === 'undefined' ? [] : ['letter', ...(hasArticleComments() ? ['comment' as const] : [])]
}
export function prepareWebsiteDraft(kind: Kind, text: string): { status: 'succeeded' | 'blocked'; reason?: string } {
  if (typeof window === 'undefined') return { status: 'blocked', reason: '请在网站中准备草稿。' }
  if (kind !== 'letter' && kind !== 'comment') return { status: 'blocked', reason: '不支持这类草稿。' }
  if (typeof text !== 'string' || !text.trim() || text.length > 3000) return { status: 'blocked', reason: '草稿需要 1–3000 字。' }
  if (draft) return { status: 'blocked', reason: '已有一份待查看的草稿，请先处理它，不会覆盖你正在编辑的内容。' }
  if (kind === 'letter' && document.querySelector('[data-letter-form][data-letter-dirty="true"]')) return { status: 'blocked', reason: '你有一封还没寄出的信，请先处理它；不会覆盖你已经填写的内容。' }
  if (kind === 'comment' && !hasArticleComments()) return { status: 'blocked', reason: '当前文章没有可用的评论入口；可以改为给博主写信。' }
  update({ id: crypto.randomUUID(), kind, text: text.trim(), article: kind === 'comment' ? getWebsiteContext().article : undefined })
  return { status: 'succeeded' }
}

export function WebsiteDrafts({ locale }: { locale: string }) {
  const delivery = useContext(LetterDeliveryContext)
  const current = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  const [phase, setPhase] = useState<'closed' | 'preview' | 'letter'>('closed')
  const [notice, setNotice] = useState('')
  const [, contextChanged] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null), prompt = useRef<HTMLButtonElement>(null)
  const en = locale === 'en'
  const close = useCallback(() => { setPhase('closed'); setNotice(''); requestAnimationFrame(() => prompt.current?.focus()) }, [])
  const delivered = useCallback((receipt: LetterReceipt) => {
    delivery?.remember(receipt)
    update(null); setPhase('closed'); setNotice('')
  }, [delivery])
  const rememberLetter = useCallback((fields: LetterDraftFields) => {
    if (!draft || draft.kind !== 'letter' || JSON.stringify(draft.letterFields) === JSON.stringify(fields)) return
    update({ ...draft, text: fields.body, letterFields: { ...fields } })
  }, [])
  useEffect(() => subscribeWebsiteContext(() => contextChanged(value => value + 1)), [])
  useEffect(() => {
    if (phase !== 'preview') return
    const element = dialog.current
    element?.showModal()
    element?.querySelector<HTMLTextAreaElement>('textarea')?.focus()
    return () => element?.close()
  }, [phase])
  if (!current) return null
  const article = getWebsiteContext().article
  const sameArticle = article && current.article && article.locale === current.article.locale && article.slug === current.article.slug
  async function copy() {
    try { await navigator.clipboard.writeText(current!.text); setNotice(en ? 'Copied. Paste it into the comment box when ready.' : '已复制，你可以粘贴到评论框后再提交。') }
    catch { setNotice(en ? 'Select and copy the draft above.' : '请选中上面的草稿文字后复制。') }
  }
  function locateComment() {
    if (!sameArticle || !hasArticleComments()) return
    const element = getArticleCommentElement()
    close()
    requestAnimationFrame(() => { element?.scrollIntoView({ block: 'center', behavior: 'smooth' }); element?.focus({ preventScroll: true }) })
  }
  return <>
    {phase === 'closed' && <div className={styles.prompt} role="status">
      <button ref={prompt} type="button" onClick={() => setPhase('preview')}>{en ? 'Review message draft' : '查看留言草稿'}</button>
    </div>}
    {phase === 'preview' && <dialog ref={dialog} className={styles.dialog} aria-labelledby="companion-draft-title" onCancel={event => { event.preventDefault(); close() }}>
      <div className={styles.header}><h2 id="companion-draft-title">{current.kind === 'letter' ? (en ? 'A letter to the host' : '给博主的信') : (en ? 'Your comment draft' : '你的评论草稿')}</h2>
        <button type="button" aria-label={en ? 'Close draft' : '关闭草稿'} onClick={close}>×</button></div>
      {current.article && <p className={styles.article}>{current.article.title}</p>}
      <p>{en ? 'This is a draft. Edit it before deciding to send.' : '这还是一份草稿，改好后再决定是否发送。'}</p>
      <label className={styles.label}>{en ? 'Draft text' : '草稿正文'}<textarea maxLength={3000} rows={9} value={current.text} onChange={event => update({ ...current, text: event.target.value })}/></label>
      <p role="status" className={styles.notice}>{notice}</p>
      <div className={styles.actions}>
        <button type="button" onClick={() => { update(null); setPhase('closed'); setNotice('') }}>{en ? 'Discard draft' : '丢弃草稿'}</button>
        {current.kind === 'letter' ? <button type="button" disabled={!current.text.trim()} onClick={() => setPhase('letter')}>{en ? 'Continue on letter paper' : '继续写信'}</button> : <>
          <button type="button" disabled={!current.text.trim()} onClick={copy}>{en ? 'Copy draft' : '复制草稿'}</button>
          {sameArticle && hasArticleComments() ? <button type="button" onClick={locateComment}>{en ? 'Go to comments' : '去评论区'}</button> : current.article &&
            <Link prefetch={false} href={`/${current.article.locale}/posts/${encodeURIComponent(current.article.slug)}`} onClick={close}>{en ? 'Return to this article' : '回到这篇文章'}</Link>}
        </>}
      </div>
      <small>{current.kind === 'letter' ? (en ? 'You will fill in your name and email, then choose whether to send privately.' : '下一步由你填写昵称和邮箱，并确认是否寄出；默认私密。') : (en ? 'Posting is completed by you in the article’s comment service.' : '评论需要由你在文章评论区完成登录和提交。')}</small>
    </dialog>}
    {phase === 'letter' && <LetterPaper locale={locale} initialDraft={{ id: current.id, body: current.text }}
      resumeDraft={current.letterFields ? { ...current.letterFields, body: current.text } : undefined}
      onDraftChange={rememberLetter} onClose={close} onDelivered={delivered}/>}
  </>
}
