// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { GET, POST } from '@/app/api/companion/[endpoint]/route'

const context = (endpoint: string) => ({ params: Promise.resolve({ endpoint }) })
function request(endpoint = 'sessions', options: RequestInit = {}) {
  return new Request(`http://127.0.0.1:3001/api/companion/${endpoint}`, {
    method: 'POST', body: '{}', ...options,
    headers: {
      host: '127.0.0.1:3001', origin: 'http://127.0.0.1:3001',
      'sec-fetch-site': 'same-origin', 'content-type': 'application/json', ...options.headers,
    },
  })
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development')
  vi.stubEnv('COMPANION_PREVIEW_API', 'http://127.0.0.1:3000')
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

it('stays unavailable outside development and without an explicit valid loopback target', async () => {
  const fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
  vi.stubEnv('NODE_ENV', 'production')
  expect((await POST(request(), context('sessions'))).status).toBe(503)
  vi.stubEnv('NODE_ENV', 'development')
  for (const upstream of ['', 'https://api.example.com', 'http://127.0.0.1:0',
    'http://127.0.0.1:99999', 'http://127.0.0.1:3000/private', 'http://user@127.0.0.1:3000']) {
    vi.stubEnv('COMPANION_PREVIEW_API', upstream)
    expect((await POST(request(), context('sessions'))).status).toBe(503)
  }
  expect(fetcher).not.toHaveBeenCalled()
})

it('rejects foreign or missing write origins, external hosts, and unknown endpoint methods', async () => {
  const fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
  const rejectedHeaders: Record<string, string>[] = [
    { origin: 'https://attacker.example' }, { origin: '' },
    { host: 'example.com', origin: 'http://example.com' }, { 'sec-fetch-site': 'cross-site' },
  ]
  for (const headers of rejectedHeaders) expect((await POST(request('sessions', { headers }), context('sessions'))).status).toBe(403)
  const noOrigin = request()
  noOrigin.headers.delete('origin')
  expect((await POST(noOrigin, context('sessions'))).status).toBe(403)
  expect((await POST(request('status'), context('status'))).status).toBe(404)
  expect((await POST(request('healthz'), context('healthz'))).status).toBe(404)
  expect((await GET(request('sessions', { method: 'GET', body: undefined }), context('sessions'))).status).toBe(404)
  expect(fetcher).not.toHaveBeenCalled()
})

it('forwards browser identity while stripping all claimed proxy authority', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('{"sessionId":"test-session"}', {
    status: 201, headers: { 'Content-Type': 'application/json', 'Set-Cookie': 'cat-agent-dev=signed; Path=/; HttpOnly; SameSite=Strict' },
  }))
  vi.stubGlobal('fetch', fetcher)
  const response = await POST(request('sessions', { headers: {
    cookie: 'cat-agent-dev=existing', authorization: 'Bearer private',
    'x-cat-proxy-token': 'forged', 'x-cat-client-ip': '1.2.3.4', 'x-cat-origin': 'https://attacker.example',
    'x-forwarded-for': '1.2.3.4', forwarded: 'for=1.2.3.4',
  } }), context('sessions'))
  expect(response.status).toBe(201)
  expect(await response.json()).toEqual({ sessionId: 'test-session' })
  expect(response.headers.get('set-cookie')).toContain('cat-agent-dev=signed')
  expect(response.headers.get('cache-control')).toBe('no-store')
  const [url, options] = fetcher.mock.calls[0]
  expect(url).toBe('http://127.0.0.1:3000/v1/public/companion/sessions')
  expect(options.headers.get('host')).toBe('127.0.0.1:3001')
  expect(options.headers.get('origin')).toBe('http://127.0.0.1:3001')
  expect(options.headers.get('cookie')).toBe('cat-agent-dev=existing')
  for (const name of ['authorization', 'x-cat-proxy-token', 'x-cat-client-ip', 'x-cat-origin', 'x-forwarded-for', 'forwarded']) {
    expect(options.headers.has(name)).toBe(false)
  }
  expect(options.redirect).toBe('error')
})

it('permits an origin-less local status read and preserves backend error codes and retry delays', async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ code: 'RATE_LIMITED' }, {
    status: 429, headers: { 'Retry-After': '60' },
  }))
  vi.stubGlobal('fetch', fetcher)
  const incoming = request('status', { method: 'GET', body: undefined })
  incoming.headers.delete('origin')
  const response = await GET(incoming, context('status'))
  expect(response.status).toBe(429)
  expect(response.headers.get('retry-after')).toBe('60')
  expect(await response.json()).toEqual({ code: 'RATE_LIMITED' })
  expect(fetcher.mock.calls[0][1].headers.has('origin')).toBe(false)
})

it('rejects oversized UTF-8 JSON and unsupported content types before forwarding', async () => {
  const fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
  expect((await POST(request('chat', { body: JSON.stringify({ message: '猫'.repeat(5400) }) }), context('chat'))).status).toBe(413)
  expect((await POST(request('chat', { headers: { 'content-type': 'text/plain' } }), context('chat'))).status).toBe(415)
  expect(fetcher).not.toHaveBeenCalled()
})

it('passes NDJSON chunks immediately and cancels the upstream when its response is cancelled', async () => {
  const cancel = vi.fn()
  const upstream = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new TextEncoder().encode('{"type":"heartbeat"}\n')) },
    cancel,
  })
  const fetcher = vi.fn().mockResolvedValue(new Response(upstream, { headers: { 'Content-Type': 'application/x-ndjson' } }))
  vi.stubGlobal('fetch', fetcher)
  const response = await POST(request('chat'), context('chat'))
  const reader = response.body!.getReader()
  expect(response.headers.get('content-type')).toBe('application/x-ndjson')
  expect(new TextDecoder().decode((await reader.read()).value)).toBe('{"type":"heartbeat"}\n')
  await reader.cancel()
  expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true)
  expect(cancel).toHaveBeenCalledOnce()
})

it('propagates the incoming abort signal and hides upstream network errors', async () => {
  const source = new AbortController()
  const fetcher = vi.fn().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('internal connection detail')), { once: true })
  }))
  vi.stubGlobal('fetch', fetcher)
  const pending = POST(request('chat', { signal: source.signal }), context('chat'))
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce())
  source.abort()
  const response = await pending
  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ code: 'SERVICE_UNAVAILABLE', message: '小灰暂时无法处理这个请求。' })
})
