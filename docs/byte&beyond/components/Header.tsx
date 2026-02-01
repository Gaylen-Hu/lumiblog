
import React from 'react';
import { Search, User } from 'lucide-react';
import { View } from '../App';

interface HeaderProps {
  view: View;
  setView: (view: View) => void;
  isScrolled: boolean;
}

const Header: React.FC<HeaderProps> = ({ view, setView, isScrolled }) => {
  const navItems: { name: string; id: View }[] = [
    { name: 'Home', id: 'home' },
    { name: 'Blog', id: 'blog' },
    { name: 'Timeline', id: 'timeline' },
    { name: 'Projects', id: 'projects' },
    { name: 'About', id: 'about' },
  ];

  return (
    <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
      isScrolled ? 'frosted-glass border-b border-gray-200/50 py-3' : 'bg-transparent py-6'
    }`}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <button 
            onClick={() => setView('home')} 
            className="text-xl font-bold tracking-tight text-[#111111]"
          >
            ELYSIUM<span className="text-blue-500">.</span>
          </button>
          
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`text-sm font-medium transition-colors relative group px-1 ${
                  view === item.id ? 'text-[#111111]' : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                {item.name}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-blue-500 transition-all ${
                  view === item.id ? 'w-full' : 'w-0 group-hover:w-full'
                }`}></span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="pl-10 pr-4 py-1.5 text-sm bg-gray-100/50 border border-transparent rounded-full focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all w-48 md:w-64"
            />
          </div>
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors text-[#555555] hover:text-[#111111]">
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
