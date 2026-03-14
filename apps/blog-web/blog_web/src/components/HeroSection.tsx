'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Beams from './ui/Beams';
import SplitText from './ui/SplitText';
import GradientText from './ui/GradientText';

export default function HeroSection() {
  const t = useTranslations('hero');

  return (
    <div className="relative min-h-[90vh] flex items-center px-6 md:px-12 lg:px-24 pt-20 overflow-hidden bg-white dark:bg-slate-950">
      {/* Animated Beams Background */}
      <Beams beamCount={8} beamOpacity={0.12} />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #111111 1px, transparent 1px),
            linear-gradient(to bottom, #111111 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50/50 dark:from-blue-950/20 to-transparent pointer-events-none" />

      {/* Floating orbs */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl relative z-10">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold tracking-wide uppercase mb-6 animate-fade-in-up">
          {t('badge')}
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-[#111111] dark:text-white leading-[1.1] mb-8">
          <SplitText
            text={t('line1')}
            delay={40}
            className="block"
          />
          <GradientText
            colors={['#3b82f6', '#6366f1', '#8b5cf6', '#3b82f6']}
            animationSpeed={6}
            className="block"
          >
            {t('line2')}
          </GradientText>
          <SplitText
            text={t('line3')}
            delay={40}
            className="block"
          />
        </h1>

        <p className="text-xl md:text-2xl text-[#555555] dark:text-gray-400 font-light leading-relaxed max-w-2xl mb-12 animate-fade-in-up delay-200">
          {t('description')}
        </p>

        <div className="flex flex-wrap gap-4 animate-fade-in-up delay-300">
          <Link
            href="/projects"
            className="px-8 py-4 bg-[#111111] dark:bg-white text-white dark:text-[#111111] rounded-full font-medium hover:bg-[#333333] dark:hover:bg-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 group"
          >
            {t('viewProjects')}
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
          <Link
            href="/posts"
            className="px-8 py-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-[#111111] dark:text-white rounded-full font-medium hover:bg-gray-50 dark:hover:bg-slate-800 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
          >
            {t('readBlog')}
          </Link>
        </div>
      </div>

      <div className="hidden lg:block absolute right-24 top-1/2 -translate-y-1/2 w-96 h-[500px]">
        <div className="w-full h-full relative">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-3xl rotate-12 animate-float" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white dark:bg-slate-900 shadow-2xl rounded-3xl -rotate-6 animate-float-delayed flex items-center justify-center border border-gray-50 dark:border-slate-800 overflow-hidden">
            <img
              src="https://picsum.photos/400/400?random=11"
              alt="Abstract"
              className="w-full h-full object-cover opacity-80"
            />
          </div>
          <div className="absolute top-1/2 left-0 w-16 h-16 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
