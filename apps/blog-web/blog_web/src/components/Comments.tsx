'use client';

import { useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { useTheme } from 'next-themes';

interface CommentsProps {
  slug: string;
}

const repo = process.env.NEXT_PUBLIC_GISCUS_REPO;
const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;

export default function Comments({ slug }: CommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!repo || !repoId || !categoryId) return;

    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', repo);
    script.setAttribute('data-repo-id', repoId);
    script.setAttribute('data-category', 'Comments');
    script.setAttribute('data-category-id', categoryId);
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', resolvedTheme === 'dark' ? 'dark' : 'light');
    script.setAttribute('data-lang', locale === 'zh' ? 'zh-CN' : 'en');
    script.crossOrigin = 'anonymous';
    script.async = true;

    container.appendChild(script);
  }, [slug, locale, resolvedTheme]);

  if (!repo || !repoId || !categoryId) return null;

  return (
    <section className="mt-16 pt-8 border-t border-gray-100">
      <div ref={containerRef} />
    </section>
  );
}
