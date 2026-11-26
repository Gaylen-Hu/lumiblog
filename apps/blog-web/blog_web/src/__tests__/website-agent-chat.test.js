import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createCompanionAgent } from '../components/companion/runtime/agent/index.js'

const widget = vi.hoisted(() => ({ panel: null }))
vi.mock('../components/companion/runtime/agent/chat-widget.js', () => ({ createChatWidget: () => widget.panel }))
let agent
beforeEach(() => {
  let sequence = 0
  widget.panel = Object.fromEntries(['setEnabled','setBusy','setPhase','setStatus','setConnection','setOpen','showRetry','setMessage','appendText','setSource','destroy'].map(key => [key, vi.fn()]))
  widget.panel.addMessage = vi.fn(() => String(++sequence))
  widget.panel.speech = Object.fromEntries(['setEngaged','clear','show','finish','updateText'].map(key => [key, vi.fn()]))
  localStorage.clear()
})
afterEach(() => { agent?.destroy(); agent = null })
function setup(stream) {
  let notify, context = { article: { slug: 'one', locale: 'zh', title: '第一篇', selection: '一段正文' } }
  const website = { getContext: () => context, subscribeContext: listener => { notify = listener; return vi.fn() } }
  const bridge = { getState: () => ({ visible: true, mode: 'reading' }), getCapabilities: () => ({ site: [], drafts: ['letter'] }),
    execute: vi.fn(async () => []), expression: vi.fn(), interruptManual: vi.fn(), stop: vi.fn(), dispose: vi.fn() }
  const transport = { request: vi.fn(async path => path === 'status' ? { configured: true, connected: true } : path === 'sessions' ? { sessionId: 'test' } : {}), streamChat: vi.fn(stream) }
  agent = createCompanionAgent({ website, transport, bridgeFactory: () => bridge })
  return { website, bridge, transport, change: next => { context = next; notify() } }
}
describe('website assistant chat context', () => {
  it('sends the current selection and shows a server-verified source', async () => {
    const h = setup(async (_body, emit) => { emit({ type: 'context', article: { title: '可信标题', slug: 'one', locale: 'zh', truncated: false } }); emit({ type: 'text', delta: '这段讲的是…' }) })
    await agent.send('这段是什么意思？')
    expect(h.transport.streamChat.mock.calls[0][0]).toMatchObject({ context: { article: { slug: 'one', selection: '一段正文' } }, capabilities: { drafts: ['letter'] } })
    expect(widget.panel.setSource).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ title: '可信标题' }))
    expect(h.bridge.execute).not.toHaveBeenCalled()
  })
  it('cancels a late article plan after navigating to another article', async () => {
    let finish, started
    const pending = new Promise(resolve => { started = resolve })
    const h = setup((_body, emit) => new Promise(resolve => {
      finish = () => { emit({ type: 'plan', planId: 'late', steps: [{ kind: 'draft', value: 'letter', text: '旧文章草稿' }] }); resolve() }; started()
    }))
    const request = agent.send('按文章帮我写封信'); await pending
    h.change({ article: { slug: 'two', locale: 'zh', title: '第二篇' } }); finish(); await request
    expect(h.bridge.execute).not.toHaveBeenCalled()
    expect(h.transport.request).toHaveBeenCalledWith('cancel', expect.objectContaining({ sessionId: 'test' }))
    expect(h.transport.streamChat.mock.calls[0][2].signal.aborted).toBe(true)
  })
  it('keeps the snapshot stable if only the selection changes during a response', async () => {
    let finish, started
    const pending = new Promise(resolve => { started = resolve })
    const h = setup((_body, emit) => new Promise(resolve => { finish = () => { emit({ type: 'text', delta: '第一段的解释' }); resolve() }; started() }))
    const request = agent.send('解释选中段落'); await pending
    h.change({ article: { slug: 'one', locale: 'zh', title: '第一篇', selection: '另一段' } }); finish(); await request
    expect(h.transport.streamChat.mock.calls[0][0].context.article.selection).toBe('一段正文')
    expect(h.transport.request.mock.calls.some(([path]) => path === 'cancel')).toBe(false)
  })
})
