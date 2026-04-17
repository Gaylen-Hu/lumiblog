import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getProjectById } from '@/lib/api'
import type { Metadata } from 'next'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { id } = await params
  const project = await getProjectById(id)
  if (!project) return { title: 'Project not found' }
  return {
    title: project.title,
    description: project.description,
    openGraph: project.coverImage ? { images: [project.coverImage] } : undefined,
  }
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { id } = await params
  const [project, t] = await Promise.all([getProjectById(id), getTranslations('projects')])

  if (!project) notFound()

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 pb-32 animate-page-fade">
      <div className="max-w-4xl mx-auto px-6 pt-12">
        <Link
          href="/projects"
          className="group flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-[#111111] dark:hover:text-white transition-colors mb-12"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t('backToList')}
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold text-[#111111] dark:text-white leading-tight mb-8 tracking-tight">
          {project.title}
        </h1>

        {project.coverImage && (
          <div className="mb-10 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800">
            <Image
              src={project.coverImage}
              alt={project.title}
              width={1200}
              height={675}
              className="w-full object-cover"
              priority
            />
          </div>
        )}

        <p className="text-lg text-[#555555] dark:text-gray-300 leading-relaxed mb-10">
          {project.description}
        </p>

        {project.techStack.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
              {t('techStack')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {project.techStack.map((tech) => (
                <span
                  key={tech}
                  className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-gray-100 dark:border-slate-700 uppercase tracking-tight"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 pt-8 border-t border-gray-100 dark:border-slate-800">
          {project.link && (
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#111111] dark:bg-white text-white dark:text-[#111111] text-sm font-semibold rounded-full hover:opacity-90 transition-opacity"
            >
              {t('visitSite')}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-200 dark:border-slate-700 text-[#111111] dark:text-white text-sm font-semibold rounded-full hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              GitHub
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
