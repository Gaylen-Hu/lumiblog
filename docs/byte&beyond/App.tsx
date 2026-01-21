
import React, { useState, useMemo, useEffect } from 'react';
import { Post, Theme } from './types';
import { MOCK_POSTS } from './constants';
import Header from './components/Header';
import PostCard from './components/PostCard';
import PostDetail from './components/PostDetail';
import { Search, Info, Github, Twitter, Linkedin, Zap } from 'lucide-react';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('light');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#0f172a'; // slate-900
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc'; // slate-50
    }
  }, [theme]);

  const filteredPosts = useMemo(() => {
    return MOCK_POSTS.filter(post => 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${theme === 'dark' ? 'dark text-slate-100' : 'text-slate-900'}`}>
      
      {/* Dynamic Header */}
      <header className="sticky top-0 z-40 glass border-b border-slate-200/50 dark:border-slate-800/50 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2 group cursor-pointer" onClick={() => setSelectedPost(null)}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:rotate-12 transition-transform">
              <Zap className="w-6 h-6" fill="currentColor" />
            </div>
            <span className="text-xl font-bold tracking-tighter">NOVA</span>
          </div>

          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search the future..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800/50 border-none rounded-2xl py-2.5 pl-11 pr-4 focus:ring-2 focus:ring-blue-500 transition-all placeholder-slate-400 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              ) : (
                <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              )}
            </button>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer hover:scale-110 transition-transform">
              <img src="https://picsum.photos/seed/user/100" alt="User" />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-12 pb-24">
        {!selectedPost && (
          <>
            <section className="mb-20 text-center">
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest mb-6 border border-blue-100 dark:border-blue-800">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Issue #42: The Neuro-Silicon Age
              </div>
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] text-slate-900 dark:text-white">
                THINKING BEYOND<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600">MODERNITY.</span>
              </h1>
              <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
                Exploring the frontiers of technology, design, and human potential through a minimalist lens.
              </p>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map(post => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  onClick={setSelectedPost} 
                />
              ))}
              {filteredPosts.length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-400">No signals found in this frequency.</h3>
                  <button onClick={() => setSearchQuery('')} className="mt-4 text-blue-500 font-semibold hover:underline">Clear search</button>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Post Modal */}
      {selectedPost && (
        <PostDetail 
          post={selectedPost} 
          onClose={() => setSelectedPost(null)} 
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-20 transition-colors">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-6">
              <Zap className="w-6 h-6 text-blue-500" />
              <span className="text-2xl font-bold tracking-tighter">NOVA</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8 leading-relaxed">
              Synthesizing the future through daily insights. We are a collective of designers and engineers committed to clarity.
            </p>
            <div className="flex space-x-5">
              <Twitter className="w-5 h-5 text-slate-400 hover:text-blue-400 cursor-pointer transition-colors" />
              <Github className="w-5 h-5 text-slate-400 hover:text-slate-100 cursor-pointer transition-colors" />
              <Linkedin className="w-5 h-5 text-slate-400 hover:text-blue-700 cursor-pointer transition-colors" />
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest mb-6 text-slate-900 dark:text-white">Exploration</h4>
            <ul className="space-y-4 text-slate-500 dark:text-slate-400">
              <li className="hover:text-blue-500 cursor-pointer transition-colors">Neuroscience</li>
              <li className="hover:text-blue-500 cursor-pointer transition-colors">Spatial Computing</li>
              <li className="hover:text-blue-500 cursor-pointer transition-colors">AI & Ethics</li>
              <li className="hover:text-blue-500 cursor-pointer transition-colors">Sustainable Tech</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest mb-6 text-slate-900 dark:text-white">Newsletter</h4>
            <p className="text-sm text-slate-500 mb-4">Stay ahead of the curve.</p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="email@nova.com" 
                className="bg-slate-100 dark:bg-slate-900 border-none rounded-xl px-4 py-2 text-sm w-full focus:ring-1 focus:ring-blue-500"
              />
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">Join</button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-slate-100 dark:border-slate-900 flex flex-col md:flex-row justify-between items-center text-xs text-slate-400 space-y-4 md:space-y-0 uppercase tracking-widest font-bold">
          <p>© 2024 NOVA DESIGN LABS. ALL RIGHTS RESERVED.</p>
          <div className="flex space-x-8">
            <span className="hover:text-slate-900 dark:hover:text-white cursor-pointer">Privacy</span>
            <span className="hover:text-slate-900 dark:hover:text-white cursor-pointer">Terms</span>
            <span className="hover:text-slate-900 dark:hover:text-white cursor-pointer">Manifesto</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
