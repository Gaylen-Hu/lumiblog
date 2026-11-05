import type { TimelineEntry } from '@/lib/api'
import { validMediaUrls } from '@/components/media/media'

export type DeskNote = {id: string; date: string; excerpt: string; photo?: string}

export function noteText(entry: TimelineEntry, en: boolean) {
  return {
    title: ((en ? entry.titleEn : entry.titleZh) || entry.titleZh || entry.titleEn || '').trim(),
    body: ((en ? entry.descEn : entry.descZh) || entry.descZh || entry.descEn || '').trim(),
  }
}

export function deskNotes(entries: TimelineEntry[], en: boolean): DeskNote[] {
  return entries.flatMap(entry => {
    const {title, body} = noteText(entry,en)
    const photo = validMediaUrls(entry.images)[0]
    if (!entry.id || !(title || body || photo)) return []
    const text = (body || title || (en ? 'Photo journal' : '影像手记')).replace(/\s+/g,' ')
    const letters = Array.from(text)
    const limit = en ? 145 : 60
    const excerpt = letters.length <= limit ? text : letters.slice(0,limit).join('').trimEnd() + '…'
    const time = Date.parse(entry.createdAt || entry.year)
    return [{id:entry.id,date:entry.createdAt?.slice(0,10) || entry.year,excerpt,photo,time:Number.isFinite(time) ? time : 0}]
  }).sort((a,b) => b.time-a.time)
}
