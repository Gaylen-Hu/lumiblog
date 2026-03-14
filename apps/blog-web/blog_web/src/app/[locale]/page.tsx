import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import HeroSection from '@/components/HeroSection'
import StatsSection from '@/components/StatsSection'
import PostCard from '@/components/PostCard'
import ProjectCard from '@/components/ProjectCard'
import { getArticles, getProjects, getSiteStats } from '@/lib/api'

export default async function Home() {
  const [articlesRes, projectsRes, stats, t] = await Promise.all([
    getArticles({ page: 1, pageSize: 6 }),
    getProjects({ featured: true, pageSize: 3 }),
    getSiteStats(),
    getTranslations('home'),
  ])

  const posts = articlesRes.data
  const projects = projectsRes.data

  return (
    <div className="animate-page-fade">
      <HeroSection />
      <StatsSection
        articleCount={stats.articleCount}
        yearsOfExperience={stats.yearsOfExperience}
        openSourceCount={stats.openSourceCount}
        talkCount={stats.talkCount}
      />

      {/* Latest Articles */}
      <section className="py-24 px-6 md:px-12 lg:px-24 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-bold text-[#111111] dark:text-white">
              {t('latestPosts')}
            </h2>
            <Link
              href="/posts"
              className="text-blue-600 font-medium flex items-center gap-2 hover:gap-3 transition-all"
            >
              {t('allPosts')}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {posts.length === 0 && (
            <div className="py-20 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-xl font-bold text-gray-400">{t('noPosts')}</h3>
            </div>
          )}
        </div>
      </section>

      {/* Featured Projects */}
      <section className="py-24 px-6 md:px-12 lg:px-24 bg-[#F9F9F9] dark:bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-bold text-[#111111] dark:text-white">
              {t('featuredProjects')}
            </h2>
            <Link
              href="/projects"
              className="text-blue-600 font-medium flex items-center gap-2 hover:gap-3 transition-all"
            >
              {t('allProjects')}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
