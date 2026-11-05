'use client'

import { lazy, Suspense, useRef, useState } from 'react'
import type { MediaItem } from './media'

const MediaViewer = lazy(() => import('./MediaViewer'))

export function useMediaViewer(items: MediaItem[], en: boolean, motion = true,
  focusAfterClose?: (index: number) => HTMLButtonElement | undefined) {
  const [index, setIndex] = useState<number | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  function openAt(index: number, button: HTMLButtonElement) {
    trigger.current = button
    setIndex(index)
  }
  function close(lastIndex: number) {
    setIndex(null)
    const button = focusAfterClose?.(lastIndex) || trigger.current
    button?.focus({ preventScroll:button === trigger.current })
  }
  const viewer = index !== null && <Suspense fallback={<span role="status">{en ? 'Opening preview…' : '正在打开预览…'}</span>}>
    <MediaViewer items={items} index={index} en={en} motion={motion} onClose={close} />
  </Suspense>
  return { openAt, isOpen:index !== null, viewer }
}
