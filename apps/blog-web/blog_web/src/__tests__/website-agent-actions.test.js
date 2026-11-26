import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createActionBridge } from '@/components/companion/runtime/agent/action-bridge.js';
import { matchSiteCommand, runSiteCommand } from '@/components/companion/runtime/agent/site-commands.js';
import { createCompanionAgent } from '@/components/companion/runtime/agent/index.js';

vi.mock('@/components/companion/runtime/agent/chat-widget.js', () => ({
  createChatWidget: () => ({
    speech: { setEngaged: vi.fn(), clear: vi.fn(), show: vi.fn(), updateText: vi.fn(), finish: vi.fn() },
    setEnabled: vi.fn(), setConnection: vi.fn(), setBusy: vi.fn(), setPhase: vi.fn(), setStatus: vi.fn(),
    showRetry: vi.fn(), setOpen: vi.fn(), setMessage: vi.fn(), appendText: vi.fn(), setSource: vi.fn(),
    addMessage: vi.fn(() => 'message'), setAnchorElement: vi.fn(), updateAnchor: vi.fn(), close: vi.fn(), destroy: vi.fn(),
  }),
}));

const cleanups = [];
beforeEach(() => localStorage.clear());
afterEach(() => { cleanups.splice(0).reverse().forEach(fn => fn()); });
const success = () => ({ status: 'succeeded' });
const defer = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
function host() {
  return { getCapabilities: () => ({ site: ['lamp_on', 'lamp_off'], drafts: ['letter', 'comment'] }),
    execute: vi.fn(success), prepareDraft: vi.fn(success) };
}
function bridge(website = host(), director = null) {
  const instance = createActionBridge({ website, getDirector: () => director, getAnimator: () => ({}) });
  cleanups.push(() => instance.dispose());
  return instance;
}
const plan = (planId, ...steps) => ({ planId, steps });
const site = value => ({ kind: 'site', value });
const draft = (text = '这是待确认的草稿') => ({ kind: 'draft', value: 'comment', text });

describe('website action bridge permissions and cancellation', () => {
  it('rejects unknown actions, extra arguments and oversized drafts before calling the host', async () => {
    const website = host(), actor = bridge(website);
    for (const [index, step] of [site('eval'), { ...site('lamp_on'), text: 'script' }, draft('x'.repeat(3001)), draft(' ')].entries()) {
      await expect(actor.execute(plan('invalid-' + index, step))).rejects.toThrow();
    }
    expect(website.execute).not.toHaveBeenCalled(); expect(website.prepareDraft).not.toHaveBeenCalled();
  });
  it('does not grant website permissions without an adapter or after capability revocation', async () => {
    expect((await bridge(null).execute(plan('absent', site('lamp_on'))))[0].status).toBe('blocked');
    const website = host(), pending = defer(), actor = bridge(website);
    website.execute.mockReturnValueOnce(pending.promise);
    const result = actor.execute(plan('revoked', site('lamp_on'), draft()));
    await vi.waitFor(() => expect(website.execute).toHaveBeenCalledOnce());
    website.getCapabilities = () => ({ site: [], drafts: [] }); pending.resolve(success());
    expect((await result).map(step => step.status)).toEqual(['succeeded', 'blocked']);
    expect(website.prepareDraft).not.toHaveBeenCalled();
  });
  it('prepares a draft exactly once without publishing or requiring a visible cat', async () => {
    const website = host(), actor = bridge(website);
    const request = plan('draft-once', draft('<script>literal draft text</script>'));
    const [one, two] = await Promise.all([actor.execute(request), actor.execute(request)]);
    expect(one).toEqual(two); expect(one[0].status).toBe('succeeded');
    expect(website.prepareDraft).toHaveBeenCalledExactlyOnceWith('comment', '<script>literal draft text</script>');
    expect(website.execute).not.toHaveBeenCalled();
  });
  it('does not execute an already aborted request', async () => {
    const website = host(), actor = bridge(website), controller = new AbortController(); controller.abort();
    expect((await actor.execute(plan('pre-aborted', site('lamp_on')), { signal: controller.signal }))[0].status).toBe('cancelled');
    expect(website.execute).not.toHaveBeenCalled();
  });
  it('cancels following steps and ignores a late host completion after manual interruption', async () => {
    const website = host(), pending = defer(), actor = bridge(website);
    website.execute.mockReturnValueOnce(pending.promise);
    const result = actor.execute(plan('interrupted', site('lamp_on'), draft()));
    await vi.waitFor(() => expect(website.execute).toHaveBeenCalledOnce());
    actor.interruptManual(); pending.resolve(success());
    expect((await result).map(step => step.status)).toEqual(['cancelled', 'cancelled']);
    expect(website.prepareDraft).not.toHaveBeenCalled();
  });
  it('honors cancellation from a progress callback before starting a host action', async () => {
    const website = host(), actor = bridge(website);
    const result = await actor.execute(plan('progress-abort', site('lamp_on')), {
      onProgress(event) { if (event.status === 'executing') actor.interruptManual(); },
    });
    expect(result[0].status).toBe('cancelled');
    expect(website.execute).not.toHaveBeenCalled();
  });
  it('keeps repeat limited to cat motions after a website action', async () => {
    const website = host(), director = { state: { visible: true, paused: false }, play: vi.fn(success) }, actor = bridge(website, director);
    await actor.execute(plan('pose', { kind: 'action', value: 'sit' }));
    await actor.execute(plan('light', site('lamp_on')));
    await actor.execute(plan('repeat', { kind: 'repeat', value: 'last' }));
    expect(director.play).toHaveBeenNthCalledWith(2, 'sit'); expect(website.execute).toHaveBeenCalledOnce();
  });
});

describe('literal website shortcuts', () => {
  it('matches only explicit commands, not negations or quoted/prose instructions', () => {
    expect(matchSiteCommand('小灰，打开台灯！')).toBe('lamp_on');
    expect(matchSiteCommand('  OPEN THE CURTAINS! ')).toBe('curtains_open');
    for (const text of ['不要关灯', '我不想打开台灯', '解释“关灯”的意思', '如果下雨就关闭窗帘', '打开台灯然后关闭窗帘']) {
      expect(matchSiteCommand(text)).toBeNull();
    }
  });
  it('uses current capabilities and only reports completion when the actual host succeeds', async () => {
    const website = host(); website.execute.mockReturnValueOnce({ status: 'unknown', reason: 'state unchanged' });
    expect(await runSiteCommand(website, 'lamp_on')).toEqual({ status: 'unknown', reason: 'state unchanged' });
    expect(await runSiteCommand(website, 'lamp_off')).toMatchObject({ status: 'succeeded', message: '台灯关好了。' });
    website.getCapabilities = () => ({ site: [], drafts: [] });
    expect((await runSiteCommand(website, 'lamp_on')).status).toBe('blocked');
    expect(website.execute).toHaveBeenCalledTimes(2);
  });
});

describe('article context cancellation in the agent', () => {
  it('passes host capabilities to its default bridge without requiring a custom factory', async () => {
    const website = { ...host(), getContext: () => ({}), subscribeContext: () => () => {} };
    const transport = { request: vi.fn(async path => path === 'status' ? { configured: true } : { sessionId: 'session' }),
      streamChat: vi.fn(async (_body, onEvent) => { onEvent({ type: 'plan', ...plan('default-host', site('lamp_on')) }); }) };
    const agent = createCompanionAgent({ transport, website, getDirector: () => null, getAnimator: () => ({}) });
    cleanups.push(() => agent.destroy());
    await agent.send('请打开台灯');
    expect(website.execute).toHaveBeenCalledExactlyOnceWith('lamp_on');
  });
  it('aborts an old article request and never executes its late draft or site plan', async () => {
    let article = { locale: 'zh', slug: 'first', title: '第一篇' };
    let notifyContext; const pending = defer();
    const website = { ...host(), getContext: () => ({ article: { ...article } }),
      subscribeContext: callback => { notifyContext = callback; return vi.fn(); } };
    const transport = { request: vi.fn(async path => path === 'status' ? { configured: true } : { sessionId: 'session' }),
      streamChat: vi.fn(async (_body, onEvent) => { await pending.promise; onEvent({ type: 'plan', ...plan('late', draft(), site('lamp_on')) }); }) };
    const actor = bridge(website);
    actor.getCapabilities = website.getCapabilities;
    const agent = createCompanionAgent({ transport, website, bridgeFactory: () => actor }); cleanups.push(() => agent.destroy());
    const sending = agent.send('请解读本文并准备一条评论');
    await vi.waitFor(() => expect(transport.streamChat).toHaveBeenCalledOnce());
    const [, , options] = transport.streamChat.mock.calls[0];
    article = { locale: 'zh', slug: 'second', title: '第二篇' }; notifyContext();
    expect(options.signal.aborted).toBe(true);
    pending.resolve(); await sending;
    expect(website.prepareDraft).not.toHaveBeenCalled(); expect(website.execute).not.toHaveBeenCalled();
    expect(transport.request.mock.calls.map(call => call[0])).toContain('cancel');
    expect(transport.request.mock.calls.map(call => call[0])).not.toContain('result');
  });
});
