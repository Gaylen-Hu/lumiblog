'use client'

import Image from 'next/image'
import { useState } from 'react'
import { mediaFormat } from './media'
import styles from './media.module.css'

export default function MediaPreview({ src, title = '', en, sizes, eager }: {
  src: string; title?: string; en: boolean; sizes: string; eager?: boolean
}) {
  const [attempt, setAttempt] = useState<'preview' | 'original' | 'failed'>('preview')
  const format = mediaFormat(src)
  if (format) {
    const video = format.startsWith('video/')
    return <span className={styles.placeholder}>{video ? '▶' : '♫'} {video ? (en ? 'Video' : '视频') : (en ? 'Audio' : '音频')}</span>
  }
  if (attempt === 'failed') return <span className={styles.placeholder}>{en ? 'Preview unavailable' : '预览暂未加载'}</span>
  const optimizable = src.startsWith('/') || /^https:\/\/[\w.-]+\.oss-cn-beijing\.aliyuncs\.com\//i.test(src)
  const direct = !optimizable || attempt === 'original'
  return <Image src={src} alt={title} fill sizes={sizes} loading={eager ? 'eager' : 'lazy'}
    unoptimized={direct} onError={() => setAttempt(direct ? 'failed' : 'original')} />
}
