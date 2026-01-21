import HeroSection from '@/components/HeroSection';
import PostCard from '@/components/PostCard';
import { getAllPosts } from '@/lib/mock-data';

export default function Home() {
  // TODO: 后端需要实现文章列表接口
  const posts = getAllPosts();

  return (
    <div className="max-w-7xl mx-auto px-6 pt-12 pb-24">
      <HeroSection />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {posts.length === 0 && (
        <div className="py-20 text-center">
          <svg
            className="w-12 h-12 text-slate-300 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <h3 className="text-xl font-bold text-slate-400">暂无文章</h3>
        </div>
      )}
    </div>
  );
}
