import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPostBySlug, getAllPosts } from '@/lib/mock-data';
import type { Metadata } from 'next';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return { title: '文章未找到' };
  }

  return {
    title: `${post.title} - NOVA`,
    description: post.excerpt,
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  // TODO: 后端需要实现文章详情接口
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="max-w-4xl mx-auto px-6 py-12 md:py-20">
      <header className="mb-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-slate-600 dark:text-slate-300 mb-8"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          返回首页
        </Link>

        <div className="flex flex-wrap gap-2 mb-6">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest border border-slate-200 dark:border-slate-700 rounded-full text-slate-500 dark:text-slate-400"
            >
              #{tag}
            </span>
          ))}
        </div>

        <h1 className="text-4xl md:text-6xl font-bold mb-8 text-slate-900 dark:text-white leading-tight">
          {post.title}
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
          <PostMeta icon="user" label="作者" value={post.author} />
          <PostMeta icon="calendar" label="日期" value={post.date} />
          <PostMeta icon="clock" label="阅读时间" value={post.readTime} />
          <PostMeta icon="category" label="分类" value={post.category} />
        </div>
      </header>

      <div className="relative aspect-video mb-12 rounded-[2rem] overflow-hidden shadow-2xl">
        <Image
          src={post.imageUrl}
          alt={post.title}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 896px) 100vw, 896px"
        />
      </div>

      <div className="prose-content text-xl text-slate-700 dark:text-slate-300 leading-relaxed">
        {post.content.split('\n\n').map((para, i) => {
          if (para.startsWith('### ')) {
            return (
              <h3
                key={i}
                className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4"
              >
                {para.replace('### ', '')}
              </h3>
            );
          }
          return (
            <p key={i} className="mb-6">
              {para}
            </p>
          );
        })}
      </div>

      <div className="mt-20 pt-10 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <p className="text-slate-400 italic text-sm">感谢阅读。</p>
        <div className="flex gap-4">
          <ShareButton label="𝕏" />
          <ShareButton label="in" />
        </div>
      </div>
    </article>
  );
}

function PostMeta({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  const icons: Record<string, React.ReactNode> = {
    user: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    calendar: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    clock: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    category: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-blue-500">{icons[icon]}</span>
      <div>
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
          {label}
        </p>
        <p className="text-sm font-semibold dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}

function ShareButton({ label }: { label: string }) {
  return (
    <button className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all">
      {label}
    </button>
  );
}
