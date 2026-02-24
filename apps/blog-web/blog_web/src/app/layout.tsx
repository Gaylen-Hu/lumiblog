import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSiteConfig } from '@/lib/api';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();

  return {
    title: config.seo.defaultTitle || config.siteName,
    description: config.seo.defaultDescription || config.siteDescription,
    keywords: config.seo.keywords || undefined,
    alternates: {
      types: {
        'application/rss+xml': '/feed.xml',
      },
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getSiteConfig();

  return (
    <html lang="zh-CN">
      <head>
        {config.analytics ? (
          <script dangerouslySetInnerHTML={{ __html: config.analytics }} />
        ) : null}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-white`}
      >
        <Header siteName={config.siteName} />
        <main className="flex-1 pt-20">{children}</main>
        <Footer
          siteName={config.siteName}
          siteDescription={config.siteDescription}
          socialLinks={config.socialLinks}
          filing={config.filing}
        />
      </body>
    </html>
  );
}
