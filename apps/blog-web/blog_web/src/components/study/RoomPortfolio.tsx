import Link from 'next/link'
import type { Ref } from 'react'
import type { Project } from '@/types'
import { editionPrint } from './portfolio-print'
import s from './portfolio.module.css'

function Print({index}: {index: number}) {
  const {ground, ink, accent, shape, lines} = editionPrint(index)
  return <div className={s.print} aria-hidden="true" style={{backgroundColor:ground,color:ink}}>
    <span>FIG. {String(index+1).padStart(2,'0')}</span>
    <svg viewBox="0 0 300 98" fill="none" preserveAspectRatio="xMidYMid meet">
      <path d={shape} fill={accent}/><path d={lines} stroke={ink} strokeWidth="1.25" strokeLinejoin="round"/>
    </svg>
    <i>✳</i>
  </div>
}

export default function RoomPortfolio({siteName, projects, locale, open, motion, onClose, panelRef}: {
  siteName: string; projects: Project[]; locale: string; open: boolean; motion: boolean; onClose: () => void; panelRef: Ref<HTMLDivElement>
}) {
  const en = locale === 'en'
  return <div className={s.folio} data-open={open} data-motion={motion} data-room-scroll
    ref={open ? panelRef : undefined} role={open ? 'dialog' : undefined} aria-modal={open || undefined}
    aria-labelledby="portfolio-title" aria-hidden={!open || undefined} inert={!open}>
    <div className={s.sheet}>
      <header className={s.masthead}>
        <div className={s.imprint}><b>{siteName}</b><span>Studio Editions</span></div>
        <button type="button" onClick={onClose} className={s.back}><span aria-hidden="true">↶</span>{en ? 'Back to the study' : '返回书房'}</button>
      </header>
      <div className={s.titleBlock}>
        <div className={s.titles}><h2 id="portfolio-title">{en ? 'Portfolio' : '作品'}</h2><i lang="en">Selected Works</i></div>
        <p><span>WORKSPACE</span>{en ? 'Ideas, made into things you can use.' : '把想法变成可以使用的东西。'}</p>
      </div>
      <div className={s.projects}>
        {projects.map((project, index) => <Link prefetch={false} className={s.card} key={project.id}
          href={`/${locale}/projects/${encodeURIComponent(project.id)}`} aria-labelledby={`portfolio-project-${index}`}>
          <Print index={index}/>
          <div className={s.copy}>
            <div className={s.name}><h3 id={`portfolio-project-${index}`}>{project.title}</h3><span aria-hidden="true">↗</span></div>
            {project.description && <p>{project.description}</p>}
            {!!project.techStack?.length && <small>{project.techStack.join('  /  ')}</small>}
          </div>
        </Link>)}
      </div>
      {!projects.length && <p className={s.empty}>{en ? 'There are no works to show here yet.' : '这一辑暂时没有可展示的作品。'}</p>}
      <footer className={s.colophon}>
        <span>{en ? `${projects.length} works` : `共 ${projects.length} 件作品`}</span>
        <Link prefetch={false} href={`/${locale}/projects`}>{en ? 'All projects' : '查看全部作品'} <i aria-hidden="true">→</i></Link>
      </footer>
    </div>
  </div>
}
