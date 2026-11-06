import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { searchExcerpt } from '@/components/study/search-excerpt'

it('preserves separate server matches for reordered keywords and typo aliases', () => {
  expect(searchExcerpt('写 <mark>Flutter</mark> 的 <mark>动画</mark>', '动画 Fluter').filter(s=>s.matched).map(s=>s.text)).toEqual(['Flutter','动画'])
})
it('decodes entities as text without rendering HTML, including nested encoded content', () => {
  const pieces = searchExcerpt('&lt;script&gt; &amp;lt; <mark>C++</mark>', 'C++')
  const html = renderToStaticMarkup(<div>{pieces.map((s,i)=>s.matched?<mark key={i}>{s.text}</mark>:s.text)}</div>)
  expect(html).not.toContain('<script>')
  expect(html).toContain('&amp;lt;')
  expect(html).toContain('<mark>C++</mark>')
})
it('old server replies and excerpts without highlights still work', () => {
  expect(searchExcerpt('学习 Flutter', 'Flutter').some(s=>s.matched)).toBe(true)
  expect(searchExcerpt('', 'Flutter')).toEqual([{text:'',matched:false}])
})
