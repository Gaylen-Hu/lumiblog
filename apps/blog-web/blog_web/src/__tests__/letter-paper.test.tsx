import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { webcrypto } from 'node:crypto'
import LetterPaper, { StandaloneLetterPaper } from '@/components/study/LetterPaper'
import { LetterDeliveryProvider } from '@/components/study/LetterDelivery'

const router = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto)
  router.replace.mockClear()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
function fillLetter(en = false) {
  fireEvent.change(screen.getByLabelText(en ? 'Your letter' : '正文'), {
    target: { value: '你好，展信好。' },
  })
  fireEvent.change(screen.getByLabelText(en ? 'Signed by' : '落款昵称'), {
    target: { value: '读者' },
  })
  fireEvent.change(screen.getByLabelText(en ? 'Your email' : '联系邮箱'), {
    target: { value: 'reader@example.test' },
  })
}
function write() {
  const delivered = vi.fn()
  render(<LetterPaper locale="zh" onDelivered={delivered} />)
  fillLetter()
  return delivered
}
describe('匿名寄信', () => {
  it('响应丢失时保留输入，重试沿用原信且凭条只交给寄件人', async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new TypeError())
      .mockResolvedValueOnce(Response.json({ received: true }, { status: 201 }))
    vi.stubGlobal('fetch', send)
    const delivered = write()
    fireEvent.click(screen.getByRole('button', { name: '封缄寄出' }))
    const retry = await screen.findByRole('button', { name: '确认上次寄送' })
    expect(screen.getByLabelText('正文')).toHaveValue('你好，展信好。')
    expect(screen.queryByText('信已送达')).toBeNull()
    expect(delivered).not.toHaveBeenCalled()
    fireEvent.click(retry)
    expect(
      await screen.findByText('已私密寄出，仅博主可查看。'),
    ).toBeInTheDocument()
    const calls = send.mock.calls.map(([, init]) => JSON.parse(init.body))
    expect(calls[0]).toEqual(calls[1])
    expect(calls[0].allowPublic).toBe(false)
    expect(calls[0]).not.toHaveProperty('token')
    expect(screen.getByText('信已送达')).toBeInTheDocument()
    expect(delivered).not.toHaveBeenCalled()
    await waitFor(() => expect(delivered).toHaveBeenCalledTimes(1), { timeout: 3000 })
    const [{ token, allowPublic }] = delivered.mock.calls[0]
    expect(allowPublic).toBe(false)
    const digest = await webcrypto.subtle.digest('SHA-256', Buffer.from(token))
    expect(Buffer.from(digest).toString('hex')).toBe(calls[0].claimDigest)
  })
  it('限流后仍可改信，单独改变公开授权也会生成新提交编号', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ retryAfter: 120 }, { status: 429 }),
      )
      .mockResolvedValueOnce(Response.json({ received: true }, { status: 201 }))
    vi.stubGlobal('fetch', send)
    write()
    fireEvent.click(screen.getByRole('button', { name: '封缄寄出' }))
    await screen.findByText(/2 分钟后再寄/)
    expect(screen.getByLabelText('正文')).toHaveValue('你好，展信好。')
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: '封缄寄出' }))
    await screen.findByText('信已收到，审核通过后可展示。')
    expect(JSON.parse(send.mock.calls[0][1].body).id).not.toBe(
      JSON.parse(send.mock.calls[1][1].body).id,
    )
  })
  it('独立信纸收到肯定回执后自动返回对应语言的书房抽屉', async () => {
    let acknowledge!: (value: Response) => void
    const send = vi.fn().mockImplementation(() => new Promise<Response>((resolve) => {
      acknowledge = resolve
    }))
    vi.stubGlobal('fetch', send)
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion') }))
    render(<LetterDeliveryProvider><StandaloneLetterPaper locale="en" /></LetterDeliveryProvider>)
    fillLetter(true)
    fireEvent.click(screen.getByRole('button', { name: 'Seal and send' }))
    await waitFor(() => expect(send).toHaveBeenCalledOnce())
    expect(router.replace).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled()
    acknowledge(Response.json({ received: true }, { status: 201 }))
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/en?room=drawer', { scroll: false }))
    expect(router.replace).toHaveBeenCalledTimes(1)
  })
})
