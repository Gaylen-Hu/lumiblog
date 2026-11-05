import { redirect } from 'next/navigation'
import { canonicalReadingHref } from '@/components/study/study-route'
import RoomContent from '@/components/study/RoomContent'
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.new-universe.cn'
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return { alternates: { canonical: `${SITE_URL}/${locale}`, languages: { zh: `${SITE_URL}/zh`, en: `${SITE_URL}/en` } } }
}

export default async function Home({ params, searchParams }: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  if (!query.room) {
    const sp = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) if (typeof value === 'string') sp.set(key, value)
    const canonical = canonicalReadingHref(`/${locale}?${sp}`, locale)
    if (canonical) redirect(canonical)
  }
  return <RoomContent params={params} />
}
