'use client';

import { Link } from '@/i18n/navigation';

interface ColumnBadgeProps {
  column: { title: string; slug: string };
}

export function ColumnBadge({ column }: ColumnBadgeProps) {
  return (
    <Link
      href={`/columns/${column.slug}`}
      onClick={(e) => e.stopPropagation()}
      className="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-semibold rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
    >
      {column.title}
    </Link>
  );
}
