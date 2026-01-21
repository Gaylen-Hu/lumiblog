import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-20 transition-colors">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center space-x-2 mb-6">
            <svg
              className="w-6 h-6 text-blue-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-2xl font-bold tracking-tighter">NOVA</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8 leading-relaxed">
            探索技术、设计与人类潜能的前沿，以极简主义的视角呈现。
          </p>
          <div className="flex space-x-5">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-blue-400 transition-colors"
              aria-label="Twitter"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-100 transition-colors"
              aria-label="GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest mb-6 text-slate-900 dark:text-white">
            探索
          </h4>
          <ul className="space-y-4 text-slate-500 dark:text-slate-400">
            <li>
              <Link
                href="/categories/tech"
                className="hover:text-blue-500 transition-colors"
              >
                技术
              </Link>
            </li>
            <li>
              <Link
                href="/categories/design"
                className="hover:text-blue-500 transition-colors"
              >
                设计
              </Link>
            </li>
            <li>
              <Link
                href="/categories/life"
                className="hover:text-blue-500 transition-colors"
              >
                生活
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest mb-6 text-slate-900 dark:text-white">
            链接
          </h4>
          <ul className="space-y-4 text-slate-500 dark:text-slate-400">
            <li>
              <Link href="/about" className="hover:text-blue-500 transition-colors">
                关于
              </Link>
            </li>
            <li>
              <Link href="/rss" className="hover:text-blue-500 transition-colors">
                RSS
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-slate-100 dark:border-slate-900 flex flex-col md:flex-row justify-between items-center text-xs text-slate-400 space-y-4 md:space-y-0 uppercase tracking-widest font-bold">
        <p>© {new Date().getFullYear()} NOVA. 保留所有权利。</p>
        <div className="flex space-x-8">
          <Link
            href="/privacy"
            className="hover:text-slate-900 dark:hover:text-white"
          >
            隐私
          </Link>
          <Link
            href="/terms"
            className="hover:text-slate-900 dark:hover:text-white"
          >
            条款
          </Link>
        </div>
      </div>
    </footer>
  );
}
