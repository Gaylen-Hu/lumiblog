'use client';

import { useTranslations } from 'next-intl';
import type { Project } from '@/types';
import TiltCard from './ui/TiltCard';
import SpotlightCard from './ui/SpotlightCard';

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const t = useTranslations('projects');

  if (!project.link) return null;

  return (
    <a
      href={project.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group cursor-pointer relative block"
    >
      <TiltCard maxTilt={8} scale={1.01}>
        <SpotlightCard
          className="rounded-[32px] overflow-hidden"
          spotlightColor="rgba(99, 102, 241, 0.1)"
        >
          <div className="aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-slate-800 mb-6 transition-transform duration-500">
            <img
              src={project.coverImage || '/placeholder-project.png'}
              alt={project.title}
              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <span className="px-4 py-2 bg-white rounded-full text-sm font-semibold text-[#111111] translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                {t('viewProject')}
              </span>
            </div>
          </div>

          <div className="px-2 pb-4">
            <h3 className="text-xl font-bold text-[#111111] dark:text-white mb-2">
              {project.title}
            </h3>
            <p className="text-[#555555] dark:text-gray-400 text-sm mb-4 line-clamp-2">
              {project.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {project.techStack.map((tech) => (
                <span
                  key={tech}
                  className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-gray-100 dark:border-slate-700 uppercase tracking-tight"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </SpotlightCard>
      </TiltCard>
    </a>
  );
}
