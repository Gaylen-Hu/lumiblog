import { createRef } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import ShelfCatalog from '@/components/study/ShelfCatalog'

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })

it('waits for IME composition, rejects a late reply, and can retry a failed lookup', async () => {
  vi.useFakeTimers()
  const fetcher = vi.fn<typeof fetch>()
  vi.stubGlobal('fetch',fetcher)
  let resolveOld!: (res: Response) => void
  fetcher.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
  fetcher.mockResolvedValueOnce(new Response(null,{status:503}))
  const hit = {id:'old-post',slug:'tea',title:'春茶',category:'随笔',publishedAt:'2024-03-01',highlight:'<mark>茶</mark>园'}
  const response = () => Response.json({data:[hit],page:1,pageSize:10,total:1})
  fetcher.mockImplementationOnce(async () => response())
  const cue = vi.fn()
  render(<ShelfCatalog locale="zh" posts={[]} sceneVisible={false} motion={false}
    panelRef={createRef()} onClose={() => {}} onCue={cue}>原分类</ShelfCatalog>)
  const input = screen.getByRole('searchbox')
  const flush = () => act(() => vi.advanceTimersByTimeAsync(220))
  fireEvent.compositionStart(input)
  fireEvent.change(input,{target:{value:'cha'}})
  await flush()
  expect(fetcher).not.toHaveBeenCalled()
  fireEvent.compositionEnd(input)
  await flush()
  fireEvent.change(input,{target:{value:'茶'}})
  await flush()
  expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true)
  await act(async () => resolveOld(response()))
  expect(screen.getByRole('status')).toHaveTextContent('暂时没能连上目录')
  fireEvent.click(screen.getByRole('button',{name:'重试'}))
  await flush()
  const card = screen.getByRole('link',{name:/春茶/})
  expect(card).toHaveAttribute('href','/zh/posts/tea')
  fireEvent.focus(card)
  expect(cue).toHaveBeenLastCalledWith(['随笔'],hit,false)
  fireEvent.click(screen.getByRole('button',{name:'清除搜索'}))
  expect(screen.getByText('原分类')).toBeVisible()
})
