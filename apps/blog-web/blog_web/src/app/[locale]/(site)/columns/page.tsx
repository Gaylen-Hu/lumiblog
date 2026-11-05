import { getLocale } from 'next-intl/server'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { getPublicColumns } from '@/lib/columns'
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.new-universe.cn'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    title: '专栏 - 墨千',
    description: '按主题系列浏览文章专栏',
    alternates: {
      canonical: `${SITE_URL}/${locale}/columns`,
      languages: { zh: `${SITE_URL}/zh/columns`, en: `${SITE_URL}/en/columns` },
    },
  }
}

function truncateDescription(text: string | null, maxLength = 100): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export default async function ColumnsPage() {
  const [columns, locale] = await Promise.all([getPublicColumns(), getLocale()])
  const en = locale === 'en'
  return <main className="magazine-page">
    <header className="magazine-heading">
      <p className="study-imprint">COLLECTED EDITIONS / READ IN SEQUENCE</p>
      <h1>{en ? 'Collections' : '专栏'}</h1>
      <p>{en ? 'A few ideas belong together. Choose an edition and take your time.' : '有些想法适合收在一起。选一本，慢慢读。'}</p>
    </header>
    {columns.length ? <div className="magazine-story-list">
      {columns.map(column => <Link key={column.id} href={`/columns/${encodeURIComponent(column.slug)}`} className="magazine-collection">
        <div className="magazine-collection-cover">
          {column.coverImage ? <Image src={column.coverImage} alt={column.title} fill sizes="(max-width: 700px) 100vw, 50vw" className="object-cover" />
            : <span aria-hidden="true" style={{fontSize:48}}>Aa</span>}
        </div>
        <h2>{column.title}</h2>
        {column.description && <p>{truncateDescription(column.description)}</p>}
        <small>{en ? `${column.articleCount} articles` : `${column.articleCount} 篇文章`} ↗</small>
      </Link>)}
    </div> : <div className="magazine-empty"><p className="study-imprint">A SHELF FOR NEW IDEAS</p><h2>{en ? 'The next edition is on its way.' : '下一本专栏，正在酝酿。'}</h2></div>}
  </main>
}
