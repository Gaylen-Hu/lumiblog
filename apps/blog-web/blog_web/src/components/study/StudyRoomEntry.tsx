'use client'

import { useContext, useEffect, useState } from 'react'
import Link from 'next/link'
import type { StudyRoomProps } from './StudyRoom'
import Logo from '../Logo'
import StudyWelcome from './StudyWelcome'
import { RoomRegistrationContext } from './StudyNavigation'
import { deferStudyGraphics } from './room-loader'
import styles from './study.module.css'

/** Only the home page fetches room data. The layout retains it after navigation. */
export default function StudyRoomEntry({ data }: { data: StudyRoomProps }) {
  const register = useContext(RoomRegistrationContext)
  const [mode, setMode] = useState<'initial' | 'static' | 'opening'>('initial')
  useEffect(() => {
    const lightweight = deferStudyGraphics()
    if (lightweight && !new URLSearchParams(window.location.search).get('room')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- The server cannot know the visitor’s bandwidth or motion preference.
      setMode('static')
      return
    }
    setMode(lightweight ? 'static' : 'opening')
    register?.({ ...data, initialSimple: lightweight })
  }, [data, register])
  function enterRoom() {
    try { localStorage.setItem('study-simple', 'false') } catch { /* Storage is optional. */ }
    setMode('opening')
    register?.({ ...data, initialSimple: false })
  }
  return <main className={styles.study}>
    <div className={styles.vignette} aria-hidden="true" />
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link prefetch={false} className={styles.brand} href={`/${data.locale}`} aria-label={data.siteName}>
          <Logo height={28} /><strong>{data.siteName}<span className="text-[#c5aa7e]">.</span></strong>
        </Link>
      </header>
      <StudyWelcome locale={data.locale} bio={data.bio} posts={data.posts} opening={mode === 'opening'}>
        {mode === 'static' && <button className={styles.enter} type="button" onClick={enterRoom}>{data.locale === 'en' ? 'Enter the 3D study' : '进入 3D 书房'} <span aria-hidden="true">→</span></button>}
      </StudyWelcome>
      <footer className={styles.footer}>
        <Link prefetch={false} className={styles.authorLink} href={`/${data.locale}/about`}>{data.name}</Link>
      </footer>
    </div>
  </main>
}
