'use client'

import { useContext, useEffect } from 'react'
import Link from 'next/link'
import type { StudyRoomProps } from './StudyRoom'
import Logo from '../Logo'
import StudyWelcome from './StudyWelcome'
import { RoomRegistrationContext } from './StudyNavigation'
import styles from './study.module.css'

/** Only the home page fetches room data. The layout retains it after navigation. */
export default function StudyRoomEntry({ data }: { data: StudyRoomProps }) {
  const register = useContext(RoomRegistrationContext)
  useEffect(() => { register?.(data) }, [data, register])
  return <main className={styles.study}>
    <div className={styles.vignette} aria-hidden="true" />
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link prefetch={false} className={styles.brand} href={`/${data.locale}`} aria-label={data.siteName}>
          <Logo height={28} /><strong>{data.siteName}<span className="text-blue-500">.</span></strong>
        </Link>
      </header>
      <StudyWelcome locale={data.locale} bio={data.bio} posts={data.posts} opening />
      <footer className={styles.footer}>
        <Link prefetch={false} className={styles.authorLink} href={`/${data.locale}/about`}>{data.name}</Link>
      </footer>
    </div>
  </main>
}
