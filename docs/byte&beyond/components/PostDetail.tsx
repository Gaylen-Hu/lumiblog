
import React, { useEffect, useState } from 'react';
import { Post } from '../types';
import { X, Sparkles, Clock, Calendar, User, ChevronLeft } from 'lucide-react';
import { getAIInsight } from '../services/geminiService';

interface PostDetailProps {
  post: Post;
  onClose: () => void;
}

const PostDetail: React.FC<PostDetailProps> = ({ post, onClose }) => {
  const [insight, setInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    const fetchInsight = async () => {
      setLoadingInsight(true);
      const res = await getAIInsight(post.content);
      setInsight(res);
      setLoadingInsight(false);
    };
    fetchInsight();
  }, [post]);

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-950 overflow-y-auto animate-in slide-in-from-bottom duration-500">
      {/* Navbar */}
      <nav className="sticky top-0 z-10 glass border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-slate-600 dark:text-slate-300"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Grid
          </button>
          <div className="text-sm font-bold tracking-tighter text-slate-900 dark:text-white">NOVA // TECH</div>
        </div>
      </nav>

      <article className="max-w-4xl mx-auto px-6 py-12 md:py-20 w-full">
        <header className="mb-12">
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map(tag => (
              <span key={tag} className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest border border-slate-200 dark:border-slate-700 rounded-full text-slate-500 dark:text-slate-400">
                #{tag}
              </span>
            ))}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-8 text-slate-900 dark:text-white leading-tight">
            {post.title}
          </h1>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Author</p>
                <p className="text-sm font-semibold dark:text-slate-200">{post.author}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Date</p>
                <p className="text-sm font-semibold dark:text-slate-200">{post.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Read Time</p>
                <p className="text-sm font-semibold dark:text-slate-200">{post.readTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Topic</p>
                <p className="text-sm font-semibold dark:text-slate-200">{post.category}</p>
              </div>
            </div>
          </div>
        </header>

        <img 
          src={post.imageUrl} 
          alt={post.title} 
          className="w-full aspect-video object-cover rounded-[2rem] shadow-2xl mb-12"
        />

        {/* AI Insight Box */}
        <div className="mb-12 p-8 rounded-[2rem] bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-700 text-white shadow-xl relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span className="text-sm font-bold uppercase tracking-widest opacity-80">AI Synthesis</span>
            </div>
            <p className="text-xl md:text-2xl font-medium leading-relaxed italic">
              {loadingInsight ? (
                <span className="animate-pulse">Synthesizing deep neural patterns...</span>
              ) : (
                `"${insight}"`
              )}
            </p>
          </div>
          <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 rotate-12 transition-transform duration-700 group-hover:scale-[2] group-hover:rotate-45">
            <Sparkles className="w-32 h-32" />
          </div>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          {post.content.split('\n\n').map((para, i) => (
            <p key={i} className="text-xl text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
              {para.startsWith('###') ? (
                <span className="block text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">
                  {para.replace('### ', '')}
                </span>
              ) : (
                para
              )}
            </p>
          ))}
        </div>
        
        <div className="mt-20 pt-10 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <p className="text-slate-400 italic text-sm">Thanks for exploring the future with Nova.</p>
          <div className="flex gap-4">
             {/* Simple social icons */}
             <div className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all cursor-pointer">𝕏</div>
             <div className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all cursor-pointer">in</div>
          </div>
        </div>
      </article>
    </div>
  );
};

export default PostDetail;
