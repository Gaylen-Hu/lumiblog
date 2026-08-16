'use client'

import { FormEvent, useState } from 'react'

// This component runs in the browser. Use the same-origin reverse proxy instead
// of a build-time API URL (which may point at localhost in the CI environment).
const API_URL = '/api/v1/public'

export function FriendLinkApplicationForm({ locale }: { locale: string }) {
  const zh = locale === 'zh'
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState('submitting'); setMessage('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch(`${API_URL}/friend-links/applications`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message[0] : body.message || 'Request failed')
      event.currentTarget.reset(); setState('success'); setMessage(zh ? '申请已收到，审核通过后会展示在这里。' : 'Application received. It will appear here after approval.')
    } catch (error) { setState('error'); setMessage(error instanceof Error ? error.message : 'Request failed') }
  }
  const input = 'mt-2 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950'
  return <section className="mt-16 rounded-3xl border border-gray-100 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/50 md:p-9">
    <div className="max-w-2xl"><h2 className="text-2xl font-bold text-slate-900 dark:text-white">{zh ? '申请交换友链' : 'Apply for a link exchange'}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{zh ? '请先在你的网站添加本站链接。审核通过后有 7 天的互链缓冲期，之后会定期核验。' : 'Please add our link first. Approved links have a 7-day grace period and are checked regularly afterwards.'}</p></div>
    <form onSubmit={submit} className="mt-7 grid gap-4 md:grid-cols-2">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{zh ? '网站名称' : 'Site name'}<input required name="siteName" maxLength={120} className={input} /></label>
      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{zh ? '联系邮箱（可选）' : 'Email (optional)'}<input name="contactEmail" type="email" maxLength={254} className={input} /></label>
      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{zh ? '网站地址' : 'Website URL'}<input required name="siteUrl" type="url" placeholder="https://" className={input} /></label>
      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{zh ? '本站链接所在页面' : 'Page containing our link'}<input required name="reciprocalUrl" type="url" placeholder="https://" className={input} /></label>
      <label className="text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">{zh ? '一句话介绍' : 'Short description'}<textarea required name="description" maxLength={500} rows={3} className={input} /></label>
      <div className="md:col-span-2 flex flex-wrap items-center gap-4"><button disabled={state === 'submitting'} className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60 dark:bg-white dark:text-slate-900">{state === 'submitting' ? (zh ? '提交中…' : 'Submitting…') : (zh ? '提交申请' : 'Submit application')}</button>{message && <p className={`text-sm ${state === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{message}</p>}</div>
    </form>
  </section>
}
