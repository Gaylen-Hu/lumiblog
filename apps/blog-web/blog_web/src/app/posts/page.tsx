import PostCard from '@/components/PostCard';
import { getAllPosts } from '@/lib/mock-data';

export const metadata = {
  title: '文章 - NOVA',
  description: '关于软件架构、设计哲学和技术探索的思考集合。',
};

export default function PostsPage() {
  // TODO: 后端需要实现文章列表接口
  const posts = getAllPosts();

  return (
    <div className="py-12 px-6 md:px-12 lg:px-24 animate-page-fade">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-[#111111]">
            文章 & 研究
          </h1>
          <p className="text-xl text-[#555555] max-w-2xl font-light mb-10">
            关于软件架构、设计哲学和技术探索的思考集合。
          </p>
          <div className="flex items-center gap-4 py-2 border-b border-gray-100 max-w-md">
            <svg
              className="w-5 h-5 text-gray-400"
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
            <input
              type="text"
              placeholder="筛选文章..."
              className="bg-transparent outline-none w-full text-sm"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        {posts.length === 0 && (
          <div className="py-20 text-center">
            <svg
              className="w-12 h-12 text-gray-300 mx-auto mb-4"
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
            <h3 className="text-xl font-bold text-gray-400">暂无文章</h3>
          </div>
        )}
      </div>
    </div>
  );
}
