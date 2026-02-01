
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Home from './components/Home';
import Articles from './components/Articles';
import Microblog from './components/Microblog';
import Projects from './components/Projects';
import About from './components/About';
import BlogPost from './components/BlogPost';
import Footer from './components/Footer';
import AISummarizer from './components/AISummarizer';
import { Article } from './types';

export type View = 'home' | 'blog' | 'timeline' | 'projects' | 'about' | 'post';

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [selectedPost, setSelectedPost] = useState<Article | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigateToPost = (post: Article) => {
    setSelectedPost(post);
    setView('post');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (newView: View) => {
    setView(newView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen selection:bg-blue-100 selection:text-blue-900 bg-white">
      <Header view={view} setView={handleNavigate} isScrolled={isScrolled} />
      
      <main className="pt-20">
        <div key={view} className="animate-page-fade">
          {view === 'home' && <Home onNavigateBlog={() => handleNavigate('blog')} onNavigateProjects={() => handleNavigate('projects')} onSelectPost={navigateToPost} />}
          {view === 'blog' && <div className="py-12 px-6 md:px-12 lg:px-24"><Articles onSelectPost={navigateToPost} fullView /></div>}
          {view === 'timeline' && <div className="py-12 px-6 md:px-12 lg:px-24 bg-[#F9F9F9]"><Microblog /></div>}
          {view === 'projects' && <div className="py-12 px-6 md:px-12 lg:px-24"><Projects /></div>}
          {view === 'about' && <div className="py-12 px-6 md:px-12 lg:px-24 bg-[#F9F9F9]"><About /></div>}
          {view === 'post' && selectedPost && <BlogPost article={selectedPost} onBack={() => handleNavigate('blog')} />}
        </div>
      </main>

      <Footer />
      <AISummarizer />

      <style>{`
        @keyframes page-fade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-page-fade {
          animation: page-fade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
