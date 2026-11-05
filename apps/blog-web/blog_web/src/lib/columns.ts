import type {
  PublicColumnListItemDto,
  PublicColumnDetailDto,
  ColumnArticleNavDto,
} from '@/types/column'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1/public'

// 专栏列表（ISR 缓存 300s）
export async function getPublicColumns(): Promise<PublicColumnListItemDto[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/columns`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) throw new Error('Failed to fetch columns')
    const columns = await res.json()
    return Array.isArray(columns) ? columns : []
  } catch {
    return []
  }
}

// 专栏详情（ISR 缓存 60s）
export async function getPublicColumnBySlug(
  slug: string,
): Promise<PublicColumnDetailDto | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/columns/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) {
      if (res.status === 404) return null
      console.error(
        `Failed to fetch column "${slug}": ${res.status} ${res.statusText}`,
      )
      return null
    }
    return res.json()
  } catch (err) {
    console.error(`Error fetching column "${slug}":`, err)
    return null
  }
}

// 专栏内文章导航
export async function getColumnArticleNav(
  slug: string,
  articleId: string,
): Promise<ColumnArticleNavDto | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/columns/${slug}/nav/${articleId}`,
      { next: { revalidate: 60 } },
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
