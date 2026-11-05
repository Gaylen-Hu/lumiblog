import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { getPublicColumnBySlug } from '@/lib/columns'
import type { Metadata } from 'next'

interface ColumnDetailPageProps {
  params: Promise<{ slug: string; locale: string }>
}

export async function generateMetadata({
  params,
}: ColumnDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const column = await getPublicColumnBySlug(slug)

  if (!column) {
    return { title: '专栏未找到' }
  }

  return {
    title: column.title,
    description: column.description || undefined,
    openGraph: column.coverImage
      ? { images: [column.coverImage] }
      : undefined,
  }
}

export default async function ColumnDetailPage({ params }: ColumnDetailPageProps) {
  const { slug, locale } = await params
  const column = await getPublicColumnBySlug(slug)
  if (!column) notFound()
  const en = locale === 'en'
  return <main className="magazine-page">
    <div className="magazine-reading-column">
      <header className="magazine-heading">
        <p className="study-imprint">COLLECTED EDITIONS / CONTENTS</p>
        {column.coverImage && <div className="mb-10 overflow-hidden">
          <Image src={column.coverImage} alt={column.title} width={1200} height={400} className="w-full h-48 md:h-64 object-cover" priority />
        </div>}
        <h1>{column.title}</h1>
        {column.description && <p>{column.description}</p>}
        <small>{en ? `${column.articles.length} articles` : `共 ${column.articles.length} 篇文章`}</small>
      </header>
      {column.articles.length ? <ol className="magazine-chapters">
        {column.articles.map((article, index) => <li key={article.id}>
          <Link href={`/posts/${encodeURIComponent(article.slug)}`}>
            <span className="chapter-number">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h2>{article.title}</h2>
              {article.summary && <p>{article.summary}</p>}
              <time dateTime={article.publishedAt}>{new Date(article.publishedAt).toLocaleDateString(en ? 'en-US' : 'zh-CN', {year:'numeric',month:'long',day:'numeric'})}</time>
            </div>
          </Link>
        </li>)}
      </ol> : <div className="magazine-empty">{en ? 'The first chapter is still being written.' : '第一篇文章，还在慢慢写。'}</div>}
    </div>
  </main>
}
