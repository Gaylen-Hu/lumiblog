'use client';

import { useEffect, useState } from 'react';
import { blockExcerpt, findBookmarkedBlock, readBookmark, resumeHash, writeBookmark } from '@/lib/reading-bookmark';

export default function ReadingProgress({locale, slug, title, hidden = false}: {locale: string; slug: string; title: string; hidden?: boolean}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const body = document.getElementById('post-body');
    if (!body) return;
    const blocks = Array.from(body.children);
    if (!blocks.length) return;
    const leaf = body.closest<HTMLElement>('[data-article-scroll]');
    const scroller = leaf || window;
    const viewportTop = () => leaf?.getBoundingClientRect().top || 0;
    const viewportHeight = () => leaf?.clientHeight || window.innerHeight;
    const readingLine = () => viewportTop() + Math.min(160, viewportHeight() * .25);
    let timer: number | undefined;
    let frame = 0;
    let lastSnapshot = '';
    let dirty = false;

    function save() {
      if (frame || !dirty || !body?.isConnected) return;
      dirty = false;
      const rect = body.getBoundingClientRect();
      if (rect.top > viewportTop() + viewportHeight() * .75 || rect.bottom < viewportTop()) return;
      const line = readingLine();
      let low = 0, high = blocks.length - 1;
      while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        if (blocks[mid].getBoundingClientRect().top <= line) low = mid;
        else high = mid - 1;
      }
      const block = blocks[low];
      const {top, height} = block.getBoundingClientRect();
      const fraction = Math.min(1, Math.max(0, (line-top) / Math.max(1,height)));
      const snapshot = low + '/' + fraction.toFixed(3);
      if (lastSnapshot === snapshot) return;
      writeBookmark(locale, {slug, title, block:low, excerpt:blockExcerpt(block), fraction});
      lastSnapshot = snapshot;
    }

    // Only the ribbon requests a restore. Ordinary links and TOC fragments
    // keep their normal navigation and browser Back keeps its native scroll.
    const previous = readBookmark(locale);
    if (previous?.slug !== slug) {
      writeBookmark(locale, {slug, title, block:0, excerpt:blockExcerpt(blocks[0]), fraction:0});
    }
    const mark = window.location.hash === resumeHash ? previous : null;
    if (mark?.slug === slug) {
      const block = blocks[findBookmarkedBlock(blocks,mark)];
      const restore = () => {
        frame = 0;
        const rect = block.getBoundingClientRect();
        const top = (leaf ? leaf.scrollTop : window.scrollY) + rect.top + rect.height * mark.fraction - readingLine();
        scroller.scrollTo({top, behavior:'instant'});
      };
      frame = requestAnimationFrame(restore);
    }
    const updateProgress = () => {
      const scrolled = leaf ? leaf.scrollTop : window.scrollY;
      const height = (leaf || document.documentElement).scrollHeight - viewportHeight();
      if (height > 0) {
        setProgress((scrolled / height) * 100);
      }
      dirty = true;
      window.clearTimeout(timer);
      timer = window.setTimeout(save, 160);
    };

    updateProgress();
    const onVisibility = () => { if (document.hidden) save(); };
    scroller.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('pagehide', save);
    window.addEventListener('popstate', save);
    document.addEventListener('click', save, true);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      scroller.removeEventListener('scroll', updateProgress);
      window.removeEventListener('pagehide', save);
      window.removeEventListener('popstate', save);
      document.removeEventListener('click', save, true);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      save();
    };
  }, [locale, slug, title]);

  if (hidden) return null;
  return (
    <div className="fixed top-0 left-0 w-full h-1 z-[60]">
      <div
        className="h-full bg-blue-500 transition-all duration-100 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
