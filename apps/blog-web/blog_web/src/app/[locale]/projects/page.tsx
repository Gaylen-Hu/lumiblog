import { getTranslations } from 'next-intl/server'
import ProjectCard from '@/components/ProjectCard'
import { getProjects } from '@/lib/api'

export default async function ProjectsPage() {
  const [projectsRes, t] = await Promise.all([getProjects(), getTranslations('projects')])
  const projects = projectsRes.data

  return (
    <div className="py-12 px-6 md:px-12 lg:px-24 animate-page-fade bg-white dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-[#111111] dark:text-white">
            {t('title')}
          </h1>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
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
