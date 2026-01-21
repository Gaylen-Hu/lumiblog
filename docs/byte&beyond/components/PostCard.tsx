
import React from 'react';
import { Post } from '../types';
import { ArrowUpRight } from 'lucide-react';

interface PostCardProps {
  post: Post;
  onClick: (post: Post) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onClick }) => {
  return (
    <div
      onClick={() => onClick(post)}
      className="group cursor-pointer flex flex-col bg-white dark:bg-slate-900 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-slate-100 dark:border-slate-800"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={post.imageUrl}
          alt={post.title}
          className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 text-xs font-semibold tracking-wider uppercase bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full text-slate-800 dark:text-slate-100">
            {post.category}
          </span>
        </div>
      </div>
      
      <div className="p-8 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-4">
          <span className="text-sm font-medium text-slate-400">{post.date}</span>
          <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
        </div>
        
        <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {post.title}
        </h3>
        
        <p className="text-slate-600 dark:text-slate-400 line-clamp-2 mb-6">
          {post.excerpt}
        </p>
        
        <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-50 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600"></div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{post.author}</span>
          </div>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">{post.readTime}</span>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
