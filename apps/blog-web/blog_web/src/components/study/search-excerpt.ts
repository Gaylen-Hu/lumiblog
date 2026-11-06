type Segment = { text: string; matched: boolean }
const clean = (value: string) => value
  .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/(?:^|\s)#{1,6}\s+|(?:^|\s)>\s+|\*\*|~~|`/g, ' ')
  .replace(/&(?:amp|lt|gt|quot|#39);/g, entity => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"})[entity] || entity)
  .replace(/\s+/g, ' ')

// Only recognize the mark delimiter. Everything else is rendered as React text.
export function searchExcerpt(source: string, query: string): Segment[] {
  const segments: Segment[] = []
  let cursor = 0
  for (const match of source.matchAll(/<mark>([\s\S]*?)<\/mark>/gi)) {
    segments.push({text:clean(source.slice(cursor,match.index)),matched:false}, {text:clean(match[1]),matched:true})
    cursor = match.index! + match[0].length
  }
  if (segments.length) {
    segments.push({text:clean(source.slice(cursor)),matched:false})
    if (segments[0].text.length > 12) segments[0].text = '…' + segments[0].text.slice(-12)
    return segments.filter(segment => segment.text)
  }
  const text = clean(source).trim(), at = text.toLowerCase().indexOf(query.toLowerCase())
  if (!query || at < 0) return [{text,matched:false}]
  return [{text:(at > 12 ? '…' : '') + text.slice(Math.max(0,at-12),at),matched:false},
    {text:text.slice(at,at+query.length),matched:true}, {text:text.slice(at+query.length),matched:false}]
}
