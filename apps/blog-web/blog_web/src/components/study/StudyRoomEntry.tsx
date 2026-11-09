'use client'

import { createContext, useContext, useEffect } from 'react'
import Link from 'next/link'
import type { StudyRoomProps } from './StudyRoom'

export const RoomRegistrationContext = createContext<((data: StudyRoomProps) => void) | null>(null)

/** Only the home page fetches room data. The layout retains it after navigation. */
export default function StudyRoomEntry({ data }: { data: StudyRoomProps }) {
  const register = useContext(RoomRegistrationContext)
  useEffect(() => { register?.(data) }, [data, register])
  const en = data.locale === 'en'
  return <main className="study-home-fallback">
    <p className="study-imprint">{data.siteName}</p>
    <h1>{data.name}</h1><p>{data.bio}</p>
    <p role="status">{en ? 'Opening the study…' : '正在打开书房…'}</p>
    <nav aria-label={en ? 'Content navigation' : '内容导航'}>
      {['posts', 'columns', 'timeline', 'projects', 'about', 'links', 'letters'].map((path, i) =>
        <Link key={path} href={`/${data.locale}/${path}`}>
          {(en ? ['Writing', 'Collections', 'Journal', 'Projects', 'About', 'Friends', 'Write a letter'] : ['文章', '专栏', '日常', '作品', '关于', '朋友', '给我写信'])[i]}
        </Link>)}
    </nav>
    {data.posts.slice(0, 3).map(post => <p key={post.id}><Link href={`/${data.locale}/posts/${encodeURIComponent(post.slug)}`}>{post.title}</Link></p>)}
  </main>
}
