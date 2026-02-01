import Link from 'next/link';
import GridBeam from './GridBeam';

export default function HeroSection() {
  return (
    <div className="relative min-h-[90vh] flex items-center px-6 md:px-12 lg:px-24 pt-20 overflow-hidden bg-white dark:bg-slate-950">
      <GridBeam />

      <div className="max-w-4xl relative z-10">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold tracking-wide uppercase mb-6 animate-fade-in-up">
          探索技术与设计的前沿
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-[#111111] dark:text-white leading-[1.1] mb-8 animate-fade-in-up delay-100">
          用代码创造
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            数字杰作
          </span>
          <br />
          的艺术。
        </h1>

        <p className="text-xl md:text-2xl text-[#555555] dark:text-gray-400 font-light leading-relaxed max-w-2xl mb-12 animate-fade-in-up delay-200">
          专注于极简设计系统和高性能应用开发，将复杂需求转化为无缝、直观的用户体验。
        </p>

        <div className="flex flex-wrap gap-4 animate-fade-in-up delay-300">
          <Link
            href="/projects"
            className="px-8 py-4 bg-[#111111] dark:bg-white text-white dark:text-[#111111] rounded-full font-medium hover:bg-[#333333] dark:hover:bg-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 group"
          >
            查看项目
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
            阅读博客
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
