import { NextRequest, NextResponse } from 'next/server'
import { searchArticles, toApiLocale } from '@/lib/api'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const q = params.get('q')?.trim()
  const page = Number(params.get('page') ?? 1)
  const locale = params.get('locale')
  if (!q || q.length > 200 || !Number.isSafeInteger(page) || page < 1 || (locale !== 'zh' && locale !== 'en')) {
    return NextResponse.json({ error: 'Invalid catalog query' }, { status: 400 })
  }
  try {
    const results = await searchArticles(q, page, toApiLocale(locale))
    return NextResponse.json(results)
  } catch {
    return NextResponse.json({ error: 'Catalog unavailable' }, { status: 503 })
  }
}
