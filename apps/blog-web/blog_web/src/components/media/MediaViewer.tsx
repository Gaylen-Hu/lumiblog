'use client'

import { useMemo, useRef } from 'react'
import Lightbox, { type Slide, type GenericSlide } from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Video from 'yet-another-react-lightbox/plugins/video'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/counter.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import { mediaFormat, type MediaItem } from './media'
import styles from './media.module.css'

interface AudioSlide extends GenericSlide { type: 'audio'; src: string; alt: string }
declare module 'yet-another-react-lightbox' {
  interface SlideTypes { audio: AudioSlide }
}

const plugins = [Zoom, Video, Counter, Captions]

export default function MediaViewer({ items, index, en, motion = true, onClose }: {
  items: MediaItem[]; index: number; en: boolean; motion?: boolean; onClose: (index: number) => void
}) {
  const current = useRef(index)
  const slides = useMemo<Slide[]>(() => items.map(({ src, title, date }) => {
    const format = mediaFormat(src)
    const description = [date, title].filter(Boolean).join(' · ')
    if (format?.startsWith('video/')) return { type:'video', sources:[{ src, type:format }], description }
    if (format?.startsWith('audio/')) return { type:'audio', src, alt:title, description }
    return { type:'image', src, alt:title, description }
  }), [items])

  return <Lightbox open index={index} slides={slides} plugins={plugins}
    className={styles.viewer} controller={{ aria:true, closeOnBackdropClick:true }}
    animation={motion ? undefined : { fade:0, swipe:0, navigation:0, zoom:0 }}
    carousel={{ preload:1, finite:slides.length < 2 }}
    zoom={{ scrollToZoom:true, maxZoomPixelRatio:3 }}
    video={{ autoPlay:false, playsInline:true, controls:true, preload:'metadata' }}
    labels={{ Lightbox:en ? 'Media viewer' : '媒体浏览器', ...(en ? {} : {
      Previous:'上一项', Next:'下一项', Close:'关闭预览', 'Zoom in':'放大', 'Zoom out':'缩小',
      Slide:'媒体', Carousel:'轮播', 'Photo gallery':'媒体列表', '{index} of {total}':'第 {index} 项，共 {total} 项',
    }) }}
    on={{ view:({ index:visible }) => { current.current = visible } }}
    close={() => onClose(current.current)}
    render={{
      slide:({ slide, offset }) => slide.type === 'audio' && offset === 0
        ? <audio key={slide.src} controls preload="metadata" aria-label={slide.alt} src={slide.src} /> : undefined,
      iconError:() => <span role="status">{en ? 'Unable to load this item' : '此项暂时无法加载'}</span>,
    }} />
}
