import { afterEach, expect, it, vi } from 'vitest'
import { getWebsiteAgentConnection } from '../components/companion/website-agent-connection'

const site = 'https://www.new-universe.cn'
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

it('keeps preview domains and self-hosted builds on their own origin', () => {
  vi.stubEnv('NEXT_PUBLIC_COMPANION_SPLIT_HOST', 'false')
  expect(getWebsiteAgentConnection(site)).toEqual({ apiBase: '/api/companion' })
  vi.stubEnv('NEXT_PUBLIC_COMPANION_SPLIT_HOST', 'true')
  expect(getWebsiteAgentConnection('https://preview.vercel.app')).toEqual({ apiBase: '/api/companion' })
})

it('addresses the fixed API host with the session cookie on JSON and streaming requests', async () => {
  vi.stubEnv('NEXT_PUBLIC_COMPANION_SPLIT_HOST', 'true')
  const fetcher = vi.fn()
    .mockResolvedValueOnce(Response.json({}))
    .mockResolvedValueOnce(Response.json({}))
    .mockResolvedValueOnce(new Response('{"type":"done"}\n'))
  vi.stubGlobal('fetch', fetcher)
  const { transport } = getWebsiteAgentConnection(site)
  await transport!.request('status', undefined)
  await transport!.request('session', {})
  await transport!.streamChat({}, vi.fn())
  const paths = ['status', 'session', 'chat']
  expect(fetcher.mock.calls.map(call => call[0])).toEqual(paths.map(p => 'https://api.new-universe.cn/api/companion/' + p))
  for (const [, options] of fetcher.mock.calls) expect(options).toMatchObject({ credentials: 'include', redirect: 'error' })
})
