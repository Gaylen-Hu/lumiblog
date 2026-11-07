import { useState } from 'react'
import MediaPreview from '@/components/media/MediaPreview'
import Logo from '../Logo'
import type { DeskNote as Note } from './desk-notes'
import styles from './desk-note.module.css'

export default function DeskNote({notes,locale,siteName}: {notes: Note[]; locale: string; siteName: string}) {
  const [index,setIndex] = useState(0)
  const [reverse,setReverse] = useState(false)
  const en = locale === 'en'
  const note = notes[index]
  return <>
    <h2 id="desk-note-title">{reverse ? (en ? 'A name in the margin' : '墨千这两个字') : (en ? 'Handwritten note' : '手写便签')}</h2>
    {reverse ? <article className={styles.story} id="note-face" aria-live="polite">
      <p>{en ? 'A single byte can keep me at this desk for an afternoon. When I finally close the editor, I often reach for a book and a pen. 墨 means ink. I borrowed it for Byte, for the code I write and the little marks I leave beside a passage worth remembering.' : '写代码时，一个字节也值得琢磨半天。合上电脑，手边常摊着一本书，读到喜欢的地方，就拿笔在页边点一下。「墨」是我给 Byte 起的中文名字，既装得下代码，也留得住那一点墨迹。'}</p>
      <p>{en ? '千 means a thousand. An old saying pairs ten thousand books with ten thousand miles. I like that the second half sends you out the door. Some days I get no farther than the end of the lane, where the osmanthus has just come into bloom. That is Beyond for me. When I come home, there is a date to write and a fresh page in this notebook.' : '「千」来自“读万卷书，行千里路”。我喜欢后半句，它催人出门。有时没走多远，只到巷口，闻见今年头一回桂花香。这样的日子，就是我说的 Beyond。回来写上日期，也就成了这本手记里的一页。'}</p>
    </article> : <div key={note?.id} className={styles.ink} id="note-face" aria-live="polite">
      {note && <time>{note.date}</time>}
      <p>{note?.excerpt ?? (en ? 'From the study' : '书房手记')}</p>
      {note?.photo && <span className={styles.print}><MediaPreview src={note.photo} en={en} sizes="128px" /></span>}
    </div>}
    <button type="button" className={styles.seal} onClick={() => setReverse(!reverse)} aria-controls="note-face" aria-pressed={reverse}
      aria-label={reverse ? (en ? 'Turn to the front' : '翻回便签正面') : (en ? 'Turn the note over' : '翻看便签背面')}>
      <Logo height={22} /><span>{siteName}</span>
    </button>
    {!reverse && note && <footer className={styles.noteFoot}>
      {notes.length > 1 && <button onClick={() => setIndex((index+1) % notes.length)}>{en ? 'Turn a note' : '换一张'} ↻</button>}
      <a href={`/${locale}/timeline#day-${encodeURIComponent(note.id)}`}>{en ? 'Read this day' : '读这天的日常'} ↗</a>
    </footer>}
  </>
}
