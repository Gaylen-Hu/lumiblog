'use client'

import { useMemo, useRef } from 'react'
import MediaPreview from '@/components/media/MediaPreview'
import { useMediaViewer } from '@/components/media/useMediaViewer'
import { mediaFormat, validMediaUrls, type MediaItem } from '@/components/media/media'
import Link from 'next/link'
import RoomImprint from './RoomImprint'
import type { TimelineEntry } from '@/lib/api'
import styles from './album.module.css'

function journalPhotos(timeline: TimelineEntry[], en: boolean) {
  const seen = new Set<string>()
  const photos: MediaItem[] = []
  for (const entry of timeline) {
    for (const src of validMediaUrls(entry.images)) {
      if (seen.has(src)) continue
      seen.add(src)
      photos.push({
        src,
        title: (en ? entry.titleEn || entry.titleZh : entry.titleZh || entry.titleEn) || (en ? 'Journal photograph' : '日常照片'),
        date: entry.createdAt?.slice(0, 10) || entry.year,
      })
    }
  }
  return photos
}

export default function RoomAlbum({ timeline, locale, motion, siteName }: { timeline: TimelineEntry[]; locale: string; motion: boolean; siteName: string }) {
  const en = locale === 'en'
  const photos = useMemo(() => journalPhotos(timeline, en), [timeline, en])
  const tiles = useRef(new Map<number, HTMLButtonElement>())
  const media = useMediaViewer(photos, en, motion, index => tiles.current.get(index))
  const mixed = photos.some(item => mediaFormat(item.src))
  if (!photos.length) return <div className={styles.empty}>
    <p>{en ? 'No public journal photos to show yet.' : '目前还没有可展示的日常照片。'}</p>
    <Link href={`/${locale}/timeline`}>{en ? 'Visit the journal' : '去看看日常'} →</Link>
  </div>

  return <>
    <p className={styles.summary}>{en ? `${photos.length} journal items · Select one to view.`
      : `公开日常里的 ${photos.length} ${mixed ? '项媒体' : '张照片'}`}</p>
    <div className={styles.grid}>
      {photos.map((item, i) => <button key={item.src} type="button" className={styles.tile}
        ref={node => { if (node) tiles.current.set(i, node); else tiles.current.delete(i) }}
        aria-label={en ? `View item ${i + 1}, ${item.title}` : `查看第 ${i + 1} ${mediaFormat(item.src) ? '项媒体' : '张照片'}，${item.title}`}
        onClick={event => media.openAt(i, event.currentTarget)}>
        <span className={styles.thumb}><MediaPreview src={item.src} en={en} sizes="(max-width: 600px) 42vw, 260px" /></span>
        <span className={styles.caption}>{item.title}</span>
        <span className={styles.printFoot}><time>{item.date}</time>{i === 0 && <RoomImprint siteName={siteName} />}</span>
      </button>)}
    </div>
    {media.viewer}
  </>
}
