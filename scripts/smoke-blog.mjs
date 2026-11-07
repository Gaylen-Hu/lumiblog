const base = new URL(process.argv[2] || 'http://127.0.0.1:3001')
const revision = process.argv[3]
const cases = [
  ['/zh', 200], ['/en', 200], ['/zh/posts', 200], ['/zh/timeline', 200],
  ['/api/study/reading?path=%2Fzh%2Ftimeline', 200],
  ['/api/study/search?q=Flutter&page=1&locale=zh', 200],
  ['/api/study/reading?path=https%3A%2F%2Fexample.com', 400],
  ['/api/study/search?q=x&page=-1&locale=zh', 400],
  ['/study-assets/daylight/garden.webp', 200],
  ['/study-assets/daylight/garden-snow.webp', 200],
]
for (const [route, status] of cases) {
  const response = await fetch(new URL(route, base), { signal: AbortSignal.timeout(30000) })
  if (response.status !== status) throw new Error(`${route}: expected ${status}, got ${response.status}`)
  if (route.startsWith('/api/study/')) {
    const value = await response.json()
    if (status === 200 && route.includes('/reading') && value.kind !== 'timeline') throw new Error('Reading returned wrong payload')
    if (status === 200 && route.includes('/search') && !Array.isArray(value.data)) throw new Error('Search returned wrong payload')
  } else await response.arrayBuffer()
  console.log(`${status} ${route}`)
}
if (revision) {
  const response = await fetch(new URL('/blog-release.json', base), { cache: 'no-store', signal: AbortSignal.timeout(10000) })
  if (!response.ok || (await response.json()).revision !== revision) throw new Error('Release revision mismatch')
  console.log(`release ${revision}`)
}
