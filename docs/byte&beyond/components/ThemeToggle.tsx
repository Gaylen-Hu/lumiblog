
import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="relative p-2 rounded-full glass border border-slate-200 dark:border-slate-800 transition-all hover:scale-110 active:scale-95 group overflow-hidden"
      aria-label="Toggle Theme"
    >
      <div className="relative z-10">
        {theme === 'light' ? (
          <Moon className="w-5 h-5 text-slate-700" />
        ) : (
          <Sun className="w-5 h-5 text-yellow-400" />
        )}
      </div>
      <div className="absolute inset-0 bg-slate-200/50 dark:bg-slate-700/50 transform scale-0 group-hover:scale-100 transition-transform duration-300 rounded-full"></div>
    </button>
  );
};

export default ThemeToggle;
