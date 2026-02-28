'use client';

import { useEffect, useRef } from 'react';

interface CommentsProps {
  slug: string;
}

export default function Comments({ slug }: CommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous Giscus instance on slug change
    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', '[REPO]');
    script.setAttribute('data-repo-id', '[REPO_ID]');
    script.setAttribute('data-category', 'Comments');
    script.setAttribute('data-category-id', '[CATEGORY_ID]');
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', 'light');
    script.setAttribute('data-lang', 'zh-CN');
    script.crossOrigin = 'anonymous';
    script.async = true;

    container.appendChild(script);
  }, [slug]);

  return (
    <section className="mt-16 pt-8 border-t border-gray-100">
      <div ref={containerRef} />
    </section>
  );
}
