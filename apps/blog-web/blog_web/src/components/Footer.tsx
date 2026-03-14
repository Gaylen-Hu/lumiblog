'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface SocialLinks {
  github?: string;
  twitter?: string;
  linkedin?: string;
  weibo?: string;
}

interface FilingInfo {
  icp: string | null;
  gongan: string | null;
  copyright: string | null;
}

interface FooterProps {
  siteName?: string;
  siteDescription?: string;
  socialLinks?: SocialLinks;
  filing?: FilingInfo;
}

const GITHUB_ICON = (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const TWITTER_ICON = (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export default function Footer({
  siteName,
  siteDescription,
  socialLinks = {},
  filing = { icp: null, gongan: null, copyright: null },
}: FooterProps) {
  const t = useTranslations('footer');
  const tRoot = useTranslations();
  const displayName = siteName || tRoot('siteName');
  const resolvedDescription = siteDescription || t('defaultDescription');
  const socialItems = [
    socialLinks.github ? { name: 'GitHub', href: socialLinks.github, icon: GITHUB_ICON } : null,
    socialLinks.twitter ? { name: 'Twitter', href: socialLinks.twitter, icon: TWITTER_ICON } : null,
  ].filter(Boolean) as { name: string; href: string; icon: React.ReactNode }[];

  const currentYear = new Date().getFullYear();
  const copyrightText = filing.copyright || `© ${currentYear} ${displayName} — ${t('copyright')}`;

  return (
    <footer className="py-20 px-6 md:px-12 lg:px-24 bg-white dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
          <div>
            <Link
              href="/"
              className="text-2xl font-bold tracking-tighter text-[#111111] dark:text-white mb-6 block"
            >
              {displayName}<span className="text-blue-500">.</span>
            </Link>
            <p className="text-[#555555] dark:text-gray-400 max-w-sm font-light leading-relaxed">
              {resolvedDescription}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end">
            {socialItems.length > 0 ? (
              <div className="flex gap-4 mb-8">
                {socialItems.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-[#111111] dark:hover:bg-white hover:text-white dark:hover:text-[#111111] transition-all duration-300"
                    aria-label={social.name}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            ) : null}
            <div className="text-sm font-medium text-gray-400 flex flex-wrap gap-6">
              <Link
                href="/about"
                className="hover:text-[#111111] dark:hover:text-white transition-colors"
              >
                {t('about')}
              </Link>
              <Link
                href="/rss"
                className="hover:text-[#111111] dark:hover:text-white transition-colors"
              >
                {t('rss')}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-20 pt-10 border-t border-gray-50 dark:border-slate-900 flex flex-col md:flex-row justify-between gap-6 text-[10px] font-bold uppercase tracking-widest text-gray-300 dark:text-gray-600">
          <div className="flex flex-col gap-2">
            <p>{copyrightText}</p>
            {filing.icp ? (
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-500 transition-colors normal-case"
              >
                {filing.icp}
              </a>
            ) : null}
            {filing.gongan ? (
              <a
                href="http://www.beian.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-500 transition-colors normal-case"
              >
                {filing.gongan}
              </a>
            ) : null}
          </div>
          <p>{t('builtWith')}</p>
        </div>
      </div>
    </footer>
  );
}
