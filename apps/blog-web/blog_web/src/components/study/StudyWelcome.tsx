import type { ReactNode } from 'react'
import Link from 'next/link'
import type { Post } from '@/types'
import styles from './study.module.css'

export function studyLinks(en: boolean) {
  return [
    ['posts', en ? 'Writing' : '文章'], ['timeline', en ? 'Life' : '日常'],
    ['projects', en ? 'Projects' : '作品'], ['about', en ? 'About' : '关于'],
    ['letters', en ? 'Write a letter' : '给我写信'],
    ['columns', en ? 'Collections' : '专栏'], ['links', en ? 'Friends' : '朋友'],
  ]
}

export default function StudyWelcome({ locale, bio, posts, opening, recovering, children }: {
  locale: string; bio: string; posts: Post[]; opening: boolean; recovering?: boolean; children?: ReactNode
}) {
  const en = locale === 'en'
  return <section className={styles.welcome} aria-label={en ? 'Welcome' : '欢迎来到书房'}>
    <span className={styles.eyebrow}>{en ? 'MAKE YOURSELF AT HOME' : '欢迎，随便坐坐'}</span>
    <h1>{en ? 'A quiet place for' : '把日子写下来，'}<br /><em>{en ? 'thoughts & little things.' : '也把想法留下来。'}</em></h1>
    <p>{bio}</p>
    <nav className={styles.fallbackLinks} aria-label={en ? 'Content navigation' : '内容导航'}>
      {studyLinks(en).map(([path, label]) => <Link prefetch={false} key={path} href={`/${locale}/${path}`}>{label} ↗</Link>)}
    </nav>
    {opening && <p role="status" className={styles.loading}><i />{recovering
      ? (en ? 'Restoring the study… Reading stays available.' : '正在恢复书房… 内容仍可正常浏览')
      : (en ? 'Opening the study… Content links are ready.' : '正在打开书房… 文字入口已可使用')}</p>}
    {children}
    <div className={styles.staticLatest}>
      {posts.slice(0, 3).map(post => <Link prefetch={false} key={post.id} href={`/${locale}/posts/${encodeURIComponent(post.slug)}`}>{post.title} <span>↗</span></Link>)}
    </div>
  </section>
}
