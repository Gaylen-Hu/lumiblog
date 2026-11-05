import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SpatialContent from '@/components/study/SpatialContent'

vi.mock('@/components/study/MagazineArticle', () => ({default: ({post}: {post:{title:string}}) => <article><h1>{post.title}</h1></article>}))
vi.mock('@/components/PostCard', () => ({default: () => null}))
vi.mock('@/components/ProjectCard', () => ({default: () => null}))
vi.mock('@/components/media/TimelineMedia', () => ({default: () => null}))
vi.mock('next-intl', () => ({useLocale: () => 'zh'}))
vi.mock('@/i18n/navigation', () => ({Link: () => null}))
const request = vi.hoisted(() => vi.fn())
let root: Root | undefined
function deferred<T>() { let resolve!: (value:T)=>void; const promise = new Promise<T>(done => {resolve=done}); return {promise,resolve} }
async function render(path: string) {
  await act(async () => {
    root ??= createRoot(document.body.appendChild(document.createElement('div')))
    root.render(<SpatialContent key={path} path={path} locale="zh" onReady={() => {}} />)
  })
}
beforeEach(() => {
  Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT:true})
  document.body.innerHTML = ''; request.mockReset(); vi.stubGlobal('fetch',request)
})
afterEach(async () => { if(root) await act(async () => root!.unmount()); root=undefined; vi.unstubAllGlobals() })
describe('spatial content loading', () => {
  it('keeps paper feedback during loading, aborts the old request and ignores its late result', async () => {
    const first=deferred<Response>(), second=deferred<Response>()
    request.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    await render('/zh/posts/first')
    expect(document.querySelector('[role="status"]')?.textContent).toContain('翻开新的一页')
    const signal=request.mock.calls[0][1].signal as AbortSignal
    await render('/zh/posts/second')
    expect(signal.aborted).toBe(true)
    await act(async () => second.resolve(new Response(JSON.stringify({kind:'article',post:{title:'Second'}}))))
    expect(document.querySelector('h1')?.textContent).toBe('Second')
    await act(async () => first.resolve(new Response(JSON.stringify({kind:'article',post:{title:'Stale first'}}))))
    expect(document.querySelector('h1')?.textContent).toBe('Second')
  })
  it('offers an in-place retry after an error without touching navigation', async () => {
    request.mockResolvedValueOnce(new Response('{}',{status:503})).mockResolvedValueOnce(new Response(JSON.stringify({kind:'article',post:{title:'Recovered'}})))
    await render('/zh/posts/retry')
    expect(document.querySelector('[role="alert"]')).toBeTruthy()
    await act(async () => document.querySelector('button')!.click())
    expect(document.querySelector('h1')?.textContent).toBe('Recovered')
    expect(request).toHaveBeenCalledTimes(2)
  })
})
