import { useState } from 'react'
import MediaPreview from '@/components/media/MediaPreview'
import type { DeskNote as Note } from './desk-notes'
import styles from './desk-note.module.css'

export default function DeskNote({notes,locale}: {notes: Note[]; locale: string}) {
  const [index,setIndex] = useState(0)
  const en = locale === 'en'
  const note = notes[index % notes.length]
  if (!note) return null
  return <>
    <div key={note.id} className={styles.ink} aria-live="polite">
      <time>{note.date}</time>
      <p>{note.excerpt}</p>
      {note.photo && <span className={styles.print}><MediaPreview src={note.photo} en={en} sizes="128px" /></span>}
    </div>
    <footer className={styles.noteFoot}>
      {notes.length > 1 && <button onClick={() => setIndex((index+1) % notes.length)}>{en ? 'Turn a note' : '换一张'} ↻</button>}
      <a href={`/${locale}/timeline#day-${encodeURIComponent(note.id)}`}>{en ? 'Read this day' : '读这天的日常'} ↗</a>
    </footer>
  </>
}
