import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { webcrypto } from 'node:crypto'
import LetterPaper from '@/components/study/LetterPaper'

beforeEach(() => vi.stubGlobal('crypto', webcrypto))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
function write() {
  render(<LetterPaper locale="zh" />)
  fireEvent.change(screen.getByLabelText('正文'), {
    target: { value: '你好，展信好。' },
  })
  fireEvent.change(screen.getByLabelText('落款昵称'), {
    target: { value: '读者' },
  })
  fireEvent.change(screen.getByLabelText('联系邮箱'), {
    target: { value: 'reader@example.test' },
  })
}
describe('匿名寄信', () => {
  it('响应丢失时保留输入，重试沿用原信且凭条只交给寄件人', async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new TypeError())
      .mockResolvedValueOnce(Response.json({ received: true }, { status: 201 }))
    vi.stubGlobal('fetch', send)
    write()
    fireEvent.click(screen.getByRole('button', { name: '封缄寄出' }))
    fireEvent.click(await screen.findByRole('button', { name: '确认上次寄送' }))
    expect(
      await screen.findByText('已私密寄出，仅博主可查看。'),
    ).toBeInTheDocument()
    const calls = send.mock.calls.map(([, init]) => JSON.parse(init.body))
    expect(calls[0]).toEqual(calls[1])
    expect(calls[0].allowPublic).toBe(false)
    expect(calls[0]).not.toHaveProperty('token')
    const token = document.querySelector('code')!.textContent!
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
})
