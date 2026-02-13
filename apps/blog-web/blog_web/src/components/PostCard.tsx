'use client';

import Link from 'next/link';
import type { Post } from '@/types';
import TiltCard from './ui/TiltCard';
import SpotlightCard from './ui/SpotlightCard';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <Link href={`/posts/${post.slug}`}>
      <TiltCard maxTilt={6} scale={1.02}>
        <SpotlightCard
          className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 hover:border-transparent hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-300 flex flex-col h-full cursor-pointer"
          spotlightColor="rgba(59, 130, 246, 0.08)"
        >
          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-xs font-semibold rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {post.category}
            </span>
            <span className="text-xs text-gray-400 font-medium">{post.date}</span>
          </div>

          <h3 className="text-xl font-bold text-[#111111] dark:text-white mb-4 leading-snug hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {post.title}
          </h3>

          <p className="text-[#555555] dark:text-gray-400 text-sm leading-relaxed mb-8 flex-grow">
            {post.excerpt}
          </p>

          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] tracking-wider uppercase text-gray-400 font-bold"
              >
                #{tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm font-semibold text-[#111111] dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors mt-auto">
            阅读文章
            <svg
              className="w-3 h-3 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </div>
        </SpotlightCard>
      </TiltCard>
    </Link>
  );
}
