import { getTranslations } from 'next-intl/server'
import ProjectCard from '@/components/ProjectCard'
import { getProjects } from '@/lib/api'
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.new-universe.cn'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    title: '项目 - 墨千',
    description: '开源项目与作品集展示',
    alternates: {
      canonical: `${SITE_URL}/${locale}/projects`,
      languages: { zh: `${SITE_URL}/zh/projects`, en: `${SITE_URL}/en/projects` },
    },
  }
}

export default async function ProjectsPage() {
  const [projectsRes, t] = await Promise.all([getProjects(), getTranslations('projects')])
  const projects = projectsRes.data

  return (
    <div className="magazine-page">
      <div className="max-w-7xl mx-auto">
        <div className="magazine-heading">
          <p className="study-imprint">FROM THE WORK DESK / SELECTED PROJECTS</p>
          <h1>
            {t('title')}
          </h1>
        </div>

        <div className="magazine-story-list">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} variant="magazine" />
          ))}
        </div>

        {projects.length === 0 && (
          <div className="py-20 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-xl font-bold text-gray-400">{t('viewProject')}</h3>
          </div>
        )}
      </div>
    </div>
  )
}
