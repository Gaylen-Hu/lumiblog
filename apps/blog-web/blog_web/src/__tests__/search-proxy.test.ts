// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/study/search/route'

afterEach(() => vi.unstubAllGlobals())
const request = (query: string) => new NextRequest('https://example.com/api/study/search?' + query)

it('preserves backend query validation errors instead of reporting an outage', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', {status:400})))
  expect((await GET(request('q=Flutter&page=1&locale=zh'))).status).toBe(400)
})
it('returns a recoverable service error for upstream failures', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', {status:500})))
  expect((await GET(request('q=Flutter&page=1&locale=zh'))).status).toBe(503)
})
it('keeps upstream ranking and pagination while mapping the locale', async () => {
  const payload = {data:[{id:'b'},{id:'a'}],total:21,page:2,pageSize:10}
  const fetcher = vi.fn().mockResolvedValue(Response.json(payload))
  vi.stubGlobal('fetch', fetcher)
  const response = await GET(request('q=Fluter&page=2&locale=zh'))
  expect(await response.json()).toEqual(payload)
  expect(String(fetcher.mock.calls[0][0])).toContain('locale=zh-CN')
})
it('invalid inputs never reach the upstream', async () => {
  const fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
  for (const query of ['q=&locale=zh','q=Flutter&page=0&locale=zh','q=Flutter&locale=xx']) expect((await GET(request(query))).status).toBe(400)
  expect(fetcher).not.toHaveBeenCalled()
})
