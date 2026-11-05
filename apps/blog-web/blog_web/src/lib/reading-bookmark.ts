export type ReadingBookmark = {
  slug: string
  title: string
  block: number
  excerpt: string
  fraction: number
}

export const resumeHash = '#study-resume'
const storageKey = (locale: string) => 'study-reading-v1:' + locale

export function readBookmark(locale: string): ReadingBookmark | null {
  try {
    const mark = JSON.parse(localStorage.getItem(storageKey(locale)) || 'null')
    if (!mark || typeof mark.slug !== 'string' || !mark.slug || /^\.{1,2}$|[/\\?#]/.test(mark.slug) ||
        typeof mark.title !== 'string' || typeof mark.excerpt !== 'string' ||
        !Number.isSafeInteger(mark.block) || mark.block < 0 ||
        !Number.isFinite(mark.fraction) || mark.fraction < 0 || mark.fraction > 1) return null
    return mark
  } catch { return null }
}

export function writeBookmark(locale: string, mark: ReadingBookmark) {
  try { localStorage.setItem(storageKey(locale), JSON.stringify(mark)) } catch { /* Private reading still works. */ }
}

export function bookmarkHref(locale: string, mark: ReadingBookmark) {
  return `/${locale}/posts/${encodeURIComponent(mark.slug)}${resumeHash}`
}

export function blockExcerpt(block: Element) {
  return (block.textContent || '').trim().replace(/\s+/g,' ').slice(0,100)
}

export function findBookmarkedBlock(blocks: Element[], mark: ReadingBookmark) {
  const fallback = Math.min(mark.block, blocks.length - 1)
  if (!mark.excerpt || !blocks.length || blockExcerpt(blocks[fallback]) === mark.excerpt) return fallback
  // Look for the same passage after an editorial insertion. For repeated
  // paragraphs, prefer the match closest to the original position.
  let best = -1
  blocks.forEach((block, index) => {
    if (blockExcerpt(block) === mark.excerpt && (best < 0 || Math.abs(index-mark.block) < Math.abs(best-mark.block))) best = index
  })
  return best < 0 ? fallback : best
}
