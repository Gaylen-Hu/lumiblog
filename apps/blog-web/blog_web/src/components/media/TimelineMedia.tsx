'use client'

import { useMemo } from 'react'
import MediaPreview from './MediaPreview'
import { validMediaUrls } from './media'
import { useMediaViewer } from './useMediaViewer'

export default function TimelineMedia({ urls, title, date, en }: {
  urls: string[]; title: string; date: string; en: boolean
}) {
  const items = useMemo(() => validMediaUrls(urls).map(src => ({ src, title, date })), [urls, title, date])
  const { openAt, viewer } = useMediaViewer(items, en)
  const single = items.length === 1
  return <>
    <div className={`mt-3 grid gap-1.5 ${single ? 'max-w-sm grid-cols-1' : 'grid-cols-2 sm:max-w-lg sm:grid-cols-3'}`}>
      {items.slice(0, 9).map((item, index) => <button type="button" key={item.src}
        onClick={event => openAt(index, event.currentTarget)}
        aria-label={en ? `Preview item ${index + 1}: ${title}` : `预览第 ${index + 1} 项：${title}`}
        className={`relative block cursor-zoom-in overflow-hidden rounded-md bg-gray-100 dark:bg-slate-800 [&_img]:object-cover ${single ? 'aspect-[4/3]' : 'aspect-square'}`}>
        <MediaPreview src={item.src} en={en} sizes={single ? '(max-width: 640px) 75vw, 384px' : '(max-width: 640px) 36vw, 170px'} />
      </button>)}
    </div>
    {viewer}
  </>
}
