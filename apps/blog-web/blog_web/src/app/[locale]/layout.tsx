import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import '../globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ThemeProvider from '@/components/ThemeProvider'
import { getSiteConfig } from '@/lib/api'
import { routing } from '@/i18n/routing'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const config = await getSiteConfig()

  return {
    title: config.seo.defaultTitle || config.siteName,
    description: config.seo.defaultDescription || config.siteDescription,
    keywords: config.seo.keywords || undefined,
    alternates: {
      languages: {
        zh: '/zh',
        en: '/en',
      },
      types: { 'application/rss+xml': `/${locale}/feed.xml` },
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!routing.locales.includes(locale as 'zh' | 'en')) {
    notFound()
  }

  const [messages, config] = await Promise.all([getMessages(), getSiteConfig()])

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* 防止暗黑模式 hydration 闪烁 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||((t==='system'||!t)&&prefersDark)){document.documentElement.classList.add('dark');}}catch(e){}})()`,
          }}
        />
        {config.analyticsGoogle ? (
          <script dangerouslySetInnerHTML={{ __html: config.analyticsGoogle }} />
        ) : null}
        {config.analyticsBaidu ? (
          <script dangerouslySetInnerHTML={{ __html: config.analyticsBaidu }} />
        ) : null}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-white dark:bg-slate-950`}
      >
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <Header siteName={config.siteName} />
            <main className="flex-1 pt-20">{children}</main>
            <Footer
              siteName={config.siteName}
              siteDescription={config.siteDescription}
              socialLinks={config.socialLinks}
              filing={config.filing}
            />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
