'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Post, Project } from '@/types'
import type { TimelineEntry } from '@/lib/api'
import { isDestination, labels, type Destination } from './model'
import styles from './study.module.css'

type Props = { locale: string; posts: Post[]; projects: Project[]; timeline: TimelineEntry[]; name: string; bio: string }
type Controller = ReturnType<typeof import('./room-scene').createRoom>

export default function StudyRoom({ locale, posts, projects, timeline, name, bio }: Props) {
  const en = locale === 'en', text = labels[en ? 'en' : 'zh']
  const host = useRef<HTMLDivElement>(null), controller = useRef<Controller | null>(null)
  const panel = useRef<HTMLDivElement>(null), previousFocus = useRef<HTMLElement | null>(null)
  const [active, setActive] = useState<Destination | null>(null)
  const [settled, setSettled] = useState<Destination | null>(null)
  const [menu, setMenu] = useState(false), [settings, setSettings] = useState(false)
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false)
  const [simple, setSimple] = useState(false), [motion, setMotion] = useState(true)
  const [sound, setSound] = useState(false), [retry, setRetry] = useState(0)
  const [hover, setHover] = useState<Destination | null>(null), [category, setCategory] = useState('')
  const activeRef = useRef(active), motionRef = useRef(motion)
  const chooseRef = useRef<(d: Destination) => void>(() => {})
  const audio = useRef<AudioContext | null>(null)
  const close = useCallback(() => {
    const url = new URL(window.location.href); url.searchParams.delete('room')
    if (window.history.state?.studyEntry) window.history.back()
    else { window.history.replaceState(window.history.state, '', url); setActive(null); setSettled(null) }
    setMenu(false); setSettings(false)
  }, [])
  const choose = useCallback((d: Destination) => {
    const focused = document.activeElement as HTMLElement | null
    previousFocus.current = focused && focused !== document.body && !focused.closest('[role="dialog"]')
      ? focused : document.querySelector<HTMLElement>('[data-room-menu]')
    const url = new URL(window.location.href); url.searchParams.set('room', d)
    if (activeRef.current) window.history.replaceState(window.history.state, '', url)
    else window.history.pushState({ ...window.history.state, studyEntry: true }, '', url)
    setMenu(false); setSettings(false); setSettled(null); setCategory(''); setActive(d)
    if (sound && audio.current) {
      // Original procedural paper rustle. No third-party audio or autoplay.
      const ctx = audio.current
      void ctx.resume().then(() => {
        if (ctx.state !== 'running') return
        const buffer = ctx.createBuffer(1, ctx.sampleRate * .25, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.sin(i / data.length * Math.PI) * .035
        const source = ctx.createBufferSource(); source.buffer = buffer
        const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 1300
        source.connect(filter); filter.connect(ctx.destination); source.start()
        source.onended = () => { source.disconnect(); filter.disconnect() }
      }).catch(() => setSound(false))
    }
  }, [sound])
  useEffect(() => { chooseRef.current = choose }, [choose])
  useEffect(() => {
    function restore() {
      const value = new URLSearchParams(window.location.search).get('room')
      setActive(isDestination(value) ? value : null); setSettled(null)
    }
    restore()
    try {
      setSimple(localStorage.getItem('study-simple') === 'true')
      setMotion(localStorage.getItem('study-motion') !== 'false')
    } catch { /* Storage is optional. */ }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { if (media.matches) setMotion(false) }
    update(); media.addEventListener('change', update)
    window.addEventListener('popstate', restore)
    return () => { window.removeEventListener('popstate', restore); media.removeEventListener('change', update); void audio.current?.close() }
  }, [])
  useEffect(() => {
    activeRef.current = active
    if (controller.current) controller.current.setTarget(active)
    else setSettled(active)
  }, [active])
  useEffect(() => {
    motionRef.current = motion; controller.current?.setMotion(motion)
    try { localStorage.setItem('study-motion', String(motion)) } catch { /* optional */ }
  }, [motion])
  useEffect(() => {
    if (simple || !host.current) return
    let cancelled = false, timedOut = false
    const fail = () => { if (!cancelled) { timedOut = true; setFailed(true); setReady(false); setSettled(activeRef.current); controller.current?.dispose(); controller.current = null } }
    const timeout = window.setTimeout(fail, 15000)
    import('./room-scene').then(({ createRoom }) => {
      if (cancelled || timedOut || !host.current) return
      controller.current = createRoom(host.current, {
        onReady: () => { window.clearTimeout(timeout); setReady(true); setFailed(false) },
        onError: fail, onPick: d => chooseRef.current(d), onHover: setHover,
        onSettled: d => { if (!cancelled && d === activeRef.current) setSettled(d) },
      })
      controller.current.setMotion(motionRef.current)
      if (activeRef.current) controller.current.setTarget(activeRef.current)
    }).catch(fail)
    return () => { cancelled = true; window.clearTimeout(timeout); controller.current?.dispose(); controller.current = null; setReady(false) }
  }, [simple, retry])
  const modal = !!settled || menu || settings
  useEffect(() => { controller.current?.setPaused(!!settled || menu || settings) }, [settled, menu, settings, ready])
  useEffect(() => {
    if (!modal) { previousFocus.current?.focus(); return }
    const dialog = panel.current
    const first = dialog?.querySelector<HTMLElement>('button, a, input, [tabindex="0"]'); first?.focus()
    function keys(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); close() }
      if (event.key !== 'Tab' || !dialog) return
      const items = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, [tabindex="0"]'))
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    window.addEventListener('keydown', keys); return () => window.removeEventListener('keydown', keys)
  }, [modal, settled, menu, settings, close])
  useEffect(() => {
    if (!active || settled) return
    function escape(event: KeyboardEvent) { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape)
  }, [active, settled, close])
  function toggleSimple() {
    const next = !simple; setSimple(next); setSettled(active)
    try { localStorage.setItem('study-simple', String(next)) } catch { /* optional */ }
  }
  function toggleSound() {
    if (sound) { setSound(false); void audio.current?.suspend(); return }
    try { audio.current ||= new AudioContext(); void audio.current.resume().then(() => setSound(true)).catch(() => setSound(false)) }
    catch { setSound(false) }
  }
  const links = [
    ['posts', en ? 'Writing' : '文章'], ['timeline', en ? 'Life' : '日常'],
    ['projects', en ? 'Projects' : '作品'], ['about', en ? 'About' : '关于'],
    ['columns', en ? 'Collections' : '专栏'], ['links', en ? 'Friends' : '朋友'],
  ]
  const categories = Array.from(new Map(posts.filter(p => p.category).map(p => [p.category!.id, p.category!])).values())
  const filteredPosts = category ? posts.filter(p => p.category?.id === category) : posts
  const noContent = en ? 'There is nothing here yet. You can still explore the full page below.' : '这里暂时没有内容，或内容服务暂不可用。你仍可以访问下方完整页面。'
  return <main className={`${styles.study} ${ready && !simple ? styles.live : ''}`}>
    <div className={styles.canvas} ref={host} />
    <div className={styles.vignette} aria-hidden="true" />
    <div className={styles.shell} inert={modal || undefined}>
      <header className={styles.header}>
        <Link className={styles.brand} href={`/${locale}`} aria-label={en ? 'Study home' : '书房首页'}><span className={styles.brandIcon}>✳</span><span>{name || 'LumiBlog'}<small>{en ? 'A LITTLE ROOM ON THE INTERNET' : '互联网里的一间小书房'}</small></span></Link>
        <div className={styles.actions}>
          <button onClick={() => { previousFocus.current = document.activeElement as HTMLElement; setSettings(true) }} aria-label={en ? 'Settings' : '环境设置'}>☷</button>
          <button data-room-menu onClick={() => { previousFocus.current = document.activeElement as HTMLElement; setMenu(true) }}>☰ <span>{en ? 'Explore' : '导航'}</span></button>
        </div>
      </header>
      <section className={styles.welcome} aria-label={en ? 'Welcome' : '欢迎来到书房'}>
        <span className={styles.eyebrow}>{en ? 'MAKE YOURSELF AT HOME' : '欢迎，随便坐坐'}</span>
        <h1>{en ? 'A quiet place for' : '把日子写下来，'}<br /><em>{en ? 'thoughts & little things.' : '也把想法留下来。'}</em></h1>
        <p>{en ? 'Writing on the shelf. Life on the desk. A little room to explore at your own pace.' : '书架里放着文章，桌上留着日常。慢慢看看，也许会有一些小发现。'}</p>
        <nav className={styles.fallbackLinks} aria-label={en ? 'Content navigation' : '内容导航'}>{links.map(([url, label]) => <Link key={url} href={`/${locale}/${url}`}>{label} ↗</Link>)}</nav>
        {!ready && !failed && !simple && <p role="status" className={styles.loading}><i />{en ? 'Opening the study… Content links are ready.' : '正在打开书房… 文字入口已可使用'}</p>}
        {failed && <div role="status" className={styles.failure}>{en ? 'The 3D room could not load. Your reading links are still here.' : '3D 书房暂未打开，内容仍可正常浏览。'} <button onClick={() => { setFailed(false); setRetry(v => v + 1) }}>{en ? 'Try again' : '重试'}</button></div>}
        {simple && <button className={styles.enter} onClick={toggleSimple}>{en ? 'Enter the 3D study' : '进入 3D 书房'} <span>→</span></button>}
        <div className={styles.staticLatest}>{posts.slice(0, 3).map(post => <Link href={`/${locale}/posts/${encodeURIComponent(post.slug)}`} key={post.id}>{post.title} <span>↗</span></Link>)}</div>
      </section>
      <footer className={styles.footer}>
        <div><span className={styles.statusDot} />{en ? 'A quiet evening' : '黄昏 · 适合读点什么'}<small>{en ? 'Drag to look around. Make yourself at home.' : '拖动看看四周，像在朋友家一样。'}</small></div>
        <div className={styles.footerActions}><button onClick={toggleSimple}>{simple ? (en ? '3D mode' : '3D 模式') : (en ? 'Simple view' : '简洁模式')}</button><button onClick={toggleSound} aria-pressed={sound} aria-label={sound ? (en ? 'Mute' : '关闭声音') : (en ? 'Enable sound' : '开启声音')}>{sound ? '♫' : '♪'}<span>{sound ? (en ? 'On' : '开') : (en ? 'Off' : '关')}</span></button></div>
      </footer>
      <nav className={styles.keyboardNav} aria-label={en ? 'Room objects' : '房间物件'}>{Object.entries(text).map(([key, value]) => <button key={key} onClick={() => choose(key as Destination)}>{value}</button>)}</nav>
      {hover && !active && <span className={styles.hoverHint}>{text[hover]}</span>}
    </div>
    {active && !settled && <button className={styles.cancel} onClick={close}>{en ? '← Back to the room' : '← 返回书房'}</button>}
    {modal && <div className={`${styles.overlay} ${settled === 'diary' ? styles.reading : ''}`}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="room-panel-title" ref={panel}>
        <button className={styles.close} onClick={close} aria-label={en ? 'Close and return' : '关闭并返回'}>×</button>
        <span className={styles.eyebrow}>{settled === 'diary' ? 'PAGES FROM EVERYDAY LIFE' : menu ? 'MAKE YOURSELF AT HOME' : settings ? 'ROOM PREFERENCES' : 'A SMALL PERSONAL COLLECTION'}</span>
        <h2 id="room-panel-title">{settled ? text[settled].split(' · ')[1] : menu ? (en ? 'Where would you like to go?' : '想去哪里看看？') : (en ? 'Make yourself comfortable' : '让自己舒服一点')}</h2>
        {menu && <><nav className={styles.menuGrid}>{Object.entries(text).map(([key, value], index) => <button key={key} onClick={() => choose(key as Destination)}><span>0{index + 1}</span>{value}<i>↗</i></button>)}</nav><nav className={styles.extraLinks}>{links.map(([url, label]) => <Link key={url} href={`/${locale}/${url}`}>{label} ↗</Link>)}<Link href={`/${locale}/classic`}>{en ? 'Original home' : '原版首页'} ↗</Link><Link href={`/${en ? 'zh' : 'en'}`}>{en ? '中文' : 'English'} ↗</Link></nav></>}
        {settings && <div className={styles.settings}>
          <p>{en ? 'A little movement, or a completely quiet room. Your choice.' : '一点点风，一点点光。也可以让房间完全安静下来。'}</p>
          <button onClick={() => setMotion(v => !v)} aria-pressed={motion}>{en ? 'Subtle movement' : '环境微动与视差'}<span>{motion ? 'ON' : 'OFF'}</span></button>
          <button onClick={toggleSound} aria-pressed={sound}>{en ? 'Interaction sounds' : '翻页与交互声音'}<span>{sound ? 'ON' : 'OFF'}</span></button>
          <button onClick={toggleSimple} aria-pressed={simple}>{en ? 'Simple view' : '简洁模式'}<span>{simple ? 'ON' : 'OFF'}</span></button>
          <p className={styles.note}>{en ? 'This first version keeps a quiet evening. Live weather and time will arrive in a later version.' : '这一版先留在安静的黄昏。实时天气与昼夜变化，会在后续版本到来。'}</p>
        </div>}
        {settled === 'bookshelf' && <>
          <p className={styles.intro}>{en ? 'Notes, experiments, and things worth keeping.' : '一些思考、尝试，以及值得留下的东西。'}</p>
          {!!categories.length && <div className={styles.categories}><button aria-pressed={!category} onClick={() => setCategory('')}>{en ? 'All' : '全部'}</button>{categories.map(c => <button key={c.id} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>{c.name}</button>)}</div>}
          <div className={styles.entries}>{filteredPosts.map((post, i) => <Link className={styles.entry} href={`/${locale}/posts/${encodeURIComponent(post.slug)}`} key={post.id}><span className={styles.entryNumber}>{String(i + 1).padStart(2, '0')}</span><div><small>{post.category?.name || (en ? 'WRITING' : '随笔')} · {post.publishedAt?.slice(0, 10)}</small><h3>{post.title}</h3>{post.excerpt && <p>{post.excerpt}</p>}</div><span>↗</span></Link>)}</div>
          {!filteredPosts.length && <p className={styles.empty}>{noContent}</p>}<Link className={styles.more} href={`/${locale}/posts`}>{en ? 'All writing' : '查看全部文章'} →</Link><Link className={styles.more} href={`/${locale}/columns`}>{en ? 'Browse collections' : '按专栏阅读'} →</Link>
        </>}
        {settled === 'diary' && <><p className={styles.intro}>{en ? 'Some days, some moments, some little things.' : '一些日子，一些瞬间，一些生活里的小事。'}</p><div className={styles.journal}>{timeline.slice(0, 12).map(entry => <article key={entry.id}><time>{entry.createdAt?.slice(0, 10) || entry.year}</time><h3>{en ? entry.titleEn || entry.titleZh : entry.titleZh}</h3><p>{en ? entry.descEn || entry.descZh : entry.descZh}</p>{entry.images?.slice(0, 3).map((src, i) => <a href={src} key={i} target="_blank" rel="noreferrer">{en ? 'View photograph' : '查看这张照片'} {i + 1} ↗</a>)}</article>)}</div>{!timeline.length && <p className={styles.empty}>{noContent}</p>}<Link className={styles.more} href={`/${locale}/timeline`}>{en ? 'The full journal' : '翻看全部日常'} →</Link></>}
        {settled === 'computer' && <><p className={styles.intro}>{en ? 'Ideas, made into something you can use.' : '把想法变成可以使用的东西。'}</p><div className={styles.entries}>{projects.map(project => <Link className={styles.entry} key={project.id} href={`/${locale}/projects/${encodeURIComponent(project.id)}`}><div><small>{project.techStack?.join(' / ')}</small><h3>{project.title}</h3><p>{project.description}</p></div><span>↗</span></Link>)}</div>{!projects.length && <p className={styles.empty}>{noContent}</p>}<Link className={styles.more} href={`/${locale}/projects`}>{en ? 'All projects' : '查看全部作品'} →</Link></>}
        {settled === 'portrait' && <div className={styles.about}><span className={styles.monogram}>{name.slice(0, 1)}</span><h3>{name}</h3><p>{bio}</p><p>{en ? 'Thank you for stopping by this little corner of the internet.' : '很高兴你来到互联网里的这个小角落。希望你在这里，找到一点共鸣。'}</p><Link className={styles.more} href={`/${locale}/about`}>{en ? 'A little more about me' : '多了解我一点'} →</Link></div>}
      </div>
    </div>}
  </main>
}
