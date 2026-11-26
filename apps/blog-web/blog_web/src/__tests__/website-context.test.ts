import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getWebsiteContext, registerWebsiteArticle, subscribeWebsiteContext } from '@/components/companion/website-context'
import { notifyStudyLocation } from '@/components/study/study-route'

const cleanups: (() => void)[] = []
function route(path: string) { window.history.replaceState({}, '', path); notifyStudyLocation() }
function register(slug = 'first', locale: 'zh' | 'en' = 'zh') {
  const element = document.createElement('article')
  element.innerHTML = '<div id="post-body"><h2>关键概念</h2><p>这是一段公开文章的正文。</p></div><footer>不应读取的页脚</footer>'
  document.body.append(element)
  cleanups.push(registerWebsiteArticle({ slug, locale, title: `${slug} title` }, element))
  return element
}
function select(node: Node, start = 0, end = node.textContent?.length ?? 0) {
  const range = document.createRange(); range.setStart(node, start); range.setEnd(node, end)
  const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range)
  document.dispatchEvent(new Event('selectionchange'))
}
beforeEach(() => route('/zh/posts/first'))
afterEach(() => { cleanups.splice(0).forEach(fn => fn()); window.getSelection()?.removeAllRanges(); document.body.innerHTML = '' })

describe('website public article context', () => {
  it('only exposes current metadata, never the loaded full text', () => {
    register()
    expect(getWebsiteContext()).toEqual({ article: { slug: 'first', locale: 'zh', title: 'first title' } })
    expect(JSON.stringify(getWebsiteContext())).not.toContain('正文')
  })
  it('invalidates retained catalog content on close and switches ownership without stale cleanup', () => {
    register()
    route('/zh?article=first')
    expect(getWebsiteContext().article?.slug).toBe('first')
    route('/zh?room=bookshelf')
    expect(getWebsiteContext()).toEqual({})
    route('/en/posts/next')
    register('next', 'en')
    cleanups.shift()?.()
    expect(getWebsiteContext().article).toEqual({ slug: 'next', locale: 'en', title: 'next title' })
    route('/en/posts/missing')
    expect(getWebsiteContext()).toEqual({})
  })
  it('captures at most 1000 body characters and their heading before chat focus clears selection', () => {
    const element = register(), text = element.querySelector('p')!.firstChild!
    text.textContent = '正'.repeat(1200)
    select(text)
    expect(getWebsiteContext().article?.selection).toHaveLength(1000)
    expect(getWebsiteContext().article?.selectionHeading).toBe('关键概念')
    window.getSelection()!.removeAllRanges()
    const input = document.createElement('textarea'); document.body.append(input); input.focus()
    expect(getWebsiteContext().article?.selection).toHaveLength(1000)
  })
  it('does not read selections from footers, other pages, or editable controls', () => {
    const element = register()
    select(element.querySelector('p')!.firstChild!)
    select(element.querySelector('footer')!.firstChild!)
    expect(getWebsiteContext().article?.selection).toBeUndefined()
    const input = document.createElement('textarea'); input.value = 'private contact'; document.body.append(input)
    input.focus(); input.setSelectionRange(0, 5)
    document.dispatchEvent(new Event('selectionchange'))
    expect(JSON.stringify(getWebsiteContext())).not.toContain('private')
  })
  it('notifies on current selection and route changes and clears previous visit selections', () => {
    const changed = vi.fn(), unsubscribe = subscribeWebsiteContext(changed), element = register()
    select(element.querySelector('p')!.firstChild!)
    const count = changed.mock.calls.length
    route('/zh?room=bookshelf')
    expect(changed.mock.calls.length).toBeGreaterThan(count)
    window.getSelection()!.removeAllRanges()
    route('/zh/posts/first')
    expect(getWebsiteContext().article?.selection).toBeUndefined()
    unsubscribe()
  })
})
