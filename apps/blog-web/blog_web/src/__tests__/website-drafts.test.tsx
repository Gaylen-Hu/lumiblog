import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { webcrypto } from 'node:crypto'
import { getDraftCapabilities, prepareWebsiteDraft, WebsiteDrafts } from '@/components/companion/website-drafts'
import { registerWebsiteArticle } from '@/components/companion/website-context'
import LetterPaper from '@/components/study/LetterPaper'
import { LetterDeliveryContext } from '@/components/study/LetterDelivery'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }))
const removeArticles: (() => void)[] = []
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('fetch', vi.fn())
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  window.history.replaceState({}, '', '/zh/posts/first')
})
afterEach(() => {
  cleanup()
  // Clear any unsent module-memory draft through the same explicit review UI.
  render(<WebsiteDrafts locale="zh" />)
  const prompt = screen.queryByRole('button', { name: '查看留言草稿' })
  if (prompt) { fireEvent.click(prompt); fireEvent.click(screen.getByRole('button', { name: '丢弃草稿' })) }
  cleanup(); removeArticles.splice(0).forEach(fn => fn()); document.body.innerHTML = ''; vi.unstubAllGlobals()
})
function prepare(text = '谢谢你的文章。') {
  let result
  act(() => { result = prepareWebsiteDraft('letter', text) })
  return result
}
function commentArticle() {
  const element = document.createElement('article')
  element.innerHTML = '<div id="post-body">Public text</div><div data-website-comments tabindex="-1"><script src="https://giscus.app/client.js"></script></div>'
  document.body.append(element)
  removeArticles.push(registerWebsiteArticle({ slug: 'first', locale: 'zh', title: '公开文章' }, element))
  return element
}

describe('reviewable website drafts', () => {
  it('only shows a light prompt after preparation, without opening or posting a letter', () => {
    render(<WebsiteDrafts locale="zh" />)
    expect(prepare()).toEqual({ status: 'succeeded' })
    expect(screen.getByRole('button', { name: '查看留言草稿' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
    expect(window.location.href).not.toContain('谢谢')
  })
  it('allows editing before passing only the body to a private unsent letter', () => {
    render(<WebsiteDrafts locale="zh" />); prepare()
    fireEvent.click(screen.getByRole('button', { name: '查看留言草稿' }))
    fireEvent.change(screen.getByLabelText('草稿正文'), { target: { value: '这是我修改后的信。' } })
    fireEvent.click(screen.getByRole('button', { name: '继续写信' }))
    expect(screen.getByLabelText('正文')).toHaveValue('这是我修改后的信。')
    expect(screen.getByLabelText('落款昵称')).toHaveValue('')
    expect(screen.getByLabelText('联系邮箱')).toHaveValue('')
    expect(screen.getByRole('checkbox')).not.toBeChecked()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('does not overwrite a pending or edited draft', () => {
    render(<WebsiteDrafts locale="zh" />); prepare('第一份草稿')
    fireEvent.click(screen.getByRole('button', { name: '查看留言草稿' }))
    fireEvent.change(screen.getByLabelText('草稿正文'), { target: { value: '我自己的修改' } })
    expect(prepare('第二份草稿')).toMatchObject({ status: 'blocked' })
    expect(screen.getByLabelText('草稿正文')).toHaveValue('我自己的修改')
  })
  it('keeps existing letter fields and public consent when a new draft prop arrives', () => {
    const sent = vi.fn(), view = render(<LetterPaper locale="zh" onDelivered={sent} />)
    fireEvent.change(screen.getByLabelText('正文'), { target: { value: '用户原来写的内容' } })
    fireEvent.change(screen.getByLabelText('联系邮箱'), { target: { value: 'reader@example.test' } })
    fireEvent.click(screen.getByRole('checkbox'))
    view.rerender(<LetterPaper locale="zh" onDelivered={sent} initialDraft={{ id: 'new-draft', body: '不能覆盖' }} />)
    expect(screen.getByLabelText('正文')).toHaveValue('用户原来写的内容')
    expect(screen.getByLabelText('联系邮箱')).toHaveValue('reader@example.test')
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.getByText('已保留你原来的信，没有用新草稿覆盖。')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('retains user edits and contact fields when returning to the preview and letter', () => {
    render(<WebsiteDrafts locale="zh" />); prepare()
    fireEvent.click(screen.getByRole('button', { name: '查看留言草稿' }))
    fireEvent.click(screen.getByRole('button', { name: '继续写信' }))
    fireEvent.change(screen.getByLabelText('正文'), { target: { value: '在信纸中修改的内容' } })
    fireEvent.change(screen.getByLabelText('落款昵称'), { target: { value: '读者' } })
    fireEvent.change(screen.getByLabelText('联系邮箱'), { target: { value: 'reader@example.test' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: '放回信纸' }))
    fireEvent.click(screen.getByRole('button', { name: '查看留言草稿' }))
    expect(screen.getByLabelText('草稿正文')).toHaveValue('在信纸中修改的内容')
    fireEvent.change(screen.getByLabelText('草稿正文'), { target: { value: '预览中又改了一次' } })
    fireEvent.click(screen.getByRole('button', { name: '继续写信' }))
    expect(screen.getByLabelText('正文')).toHaveValue('预览中又改了一次')
    expect(screen.getByLabelText('落款昵称')).toHaveValue('读者')
    expect(screen.getByLabelText('联系邮箱')).toHaveValue('reader@example.test')
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('declines a generated letter while the user has another unfinished handwritten letter', () => {
    render(<><LetterPaper locale="zh" onDelivered={vi.fn()} /><WebsiteDrafts locale="zh" /></>)
    fireEvent.change(screen.getByLabelText('正文'), { target: { value: '原本的手写信' } })
    expect(prepare('新生成的信')).toMatchObject({ status: 'blocked' })
    expect(screen.queryByRole('button', { name: '查看留言草稿' })).toBeNull()
    expect(screen.getByLabelText('正文')).toHaveValue('原本的手写信')
  })
  it('remembers the private delivery receipt after an explicitly submitted letter', async () => {
    const remember = vi.fn(), send = vi.fn().mockResolvedValue(Response.json({ received: true }))
    vi.stubGlobal('fetch', send)
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    render(<LetterDeliveryContext.Provider value={{ receipt: null, remember }}><WebsiteDrafts locale="zh" /></LetterDeliveryContext.Provider>)
    prepare()
    fireEvent.click(screen.getByRole('button', { name: '查看留言草稿' }))
    fireEvent.click(screen.getByRole('button', { name: '继续写信' }))
    fireEvent.change(screen.getByLabelText('落款昵称'), { target: { value: '读者' } })
    fireEvent.change(screen.getByLabelText('联系邮箱'), { target: { value: 'reader@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: '封缄寄出' }))
    await waitFor(() => expect(remember).toHaveBeenCalledTimes(1))
    expect(remember.mock.calls[0][0]).toEqual({ token: expect.stringMatching(/^[a-f0-9]{64}$/), allowPublic: false })
    expect(JSON.parse(send.mock.calls[0][1].body)).not.toHaveProperty('token')
    expect(screen.queryByRole('button', { name: '查看留言草稿' })).toBeNull()
  })
  it('keeps an uncertain submission mounted and retries the same packet', async () => {
    const send = vi.fn().mockRejectedValueOnce(new TypeError()).mockResolvedValueOnce(Response.json({ received: true }))
    vi.stubGlobal('fetch', send)
    render(<WebsiteDrafts locale="zh" />); prepare()
    fireEvent.click(screen.getByRole('button', { name: '查看留言草稿' }))
    fireEvent.click(screen.getByRole('button', { name: '继续写信' }))
    fireEvent.change(screen.getByLabelText('落款昵称'), { target: { value: '读者' } })
    fireEvent.change(screen.getByLabelText('联系邮箱'), { target: { value: 'reader@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: '封缄寄出' }))
    await screen.findByRole('button', { name: '确认上次寄送' })
    fireEvent.click(screen.getByRole('button', { name: '放回信纸' }))
    expect(screen.getByLabelText('正文')).toBeDisabled()
    expect(screen.getByText('请先确认上次寄送，再放回信纸，避免重复寄出。')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '确认上次寄送' }))
    await screen.findByText('信已送达')
    expect(JSON.parse(send.mock.calls[0][1].body)).toEqual(JSON.parse(send.mock.calls[1][1].body))
  })
  it('only offers comments for an active configured article, and only copies on a click', async () => {
    render(<WebsiteDrafts locale="zh" />)
    expect(getDraftCapabilities()).toEqual(['letter'])
    expect(prepareWebsiteDraft('comment', '评论')).toMatchObject({ status: 'blocked' })
    commentArticle()
    expect(getDraftCapabilities()).toEqual(['letter', 'comment'])
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    act(() => { expect(prepareWebsiteDraft('comment', '我对这篇文章的想法')).toEqual({ status: 'succeeded' }) })
    fireEvent.click(screen.getByRole('button', { name: '查看留言草稿' }))
    expect(writeText).not.toHaveBeenCalled()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '复制草稿' })))
    expect(writeText).toHaveBeenCalledWith('我对这篇文章的想法')
    expect(fetch).not.toHaveBeenCalled()
  })
})
