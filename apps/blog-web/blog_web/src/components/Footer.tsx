'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  email?: string | null;
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

const EMAIL_ICON = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const WECHAT_ICON = (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .24-.11.24-.245 0-.06-.024-.12-.04-.178l-.325-1.233a.492.492 0 01.177-.554C23.028 18.553 24 16.803 24 14.86c0-3.09-2.72-5.864-7.062-6.001zm-2.18 2.769c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982z" />
  </svg>
);

export default function Footer({
  siteName,
  siteDescription,
  socialLinks = {},
  filing = { icp: null, gongan: null, copyright: null },
  email,
}: FooterProps) {
  const t = useTranslations('footer');
  const tRoot = useTranslations();
  const [showWechat, setShowWechat] = useState(false);
  const displayName = siteName || tRoot('siteName');
  const resolvedDescription = siteDescription || t('defaultDescription');
  const socialItems = [
    socialLinks.github ? { name: 'GitHub', href: socialLinks.github, icon: GITHUB_ICON } : null,
    socialLinks.twitter ? { name: 'Twitter', href: socialLinks.twitter, icon: TWITTER_ICON } : null,
    email ? { name: 'Email', href: `mailto:${email}`, icon: EMAIL_ICON } : null,
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
            {(socialItems.length > 0) ? (
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
                {/* WeChat button with QR popup */}
                <div className="relative">
                  <button
                    onClick={() => setShowWechat(!showWechat)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-[#07c160] hover:text-white transition-all duration-300"
                    aria-label="WeChat"
                  >
                    {WECHAT_ICON}
                  </button>
                  {showWechat && (
                    <>
                      {/* 点击外部关闭 */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowWechat(false)}
                      />
                      {/* 弹出卡片 */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 p-3 w-[148px]">
                          <Image
                            src="/wechatQrcode.jpg"
                            alt="WeChat QR Code"
                            width={124}
                            height={124}
                            className="rounded-lg w-full h-auto"
                          />
                          <p className="text-[11px] text-center text-gray-400 dark:text-gray-500 mt-2 leading-tight">
                            {t('scanWechat')}
                          </p>
                        </div>
                        {/* 小三角 */}
                        <div className="absolute left-1/2 -translate-x-1/2 -bottom-[6px] w-3 h-3 rotate-45 bg-white dark:bg-slate-800 border-r border-b border-gray-100 dark:border-slate-700" />
                      </div>
                    </>
                  )}
                </div>
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
