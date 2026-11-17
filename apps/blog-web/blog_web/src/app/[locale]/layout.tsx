import StudyShell from '@/components/study/StudyShell'
import { LetterDeliveryProvider } from '@/components/study/LetterDelivery'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import '../globals.css'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/react'
import SiteAnalytics from '@/components/SiteAnalytics'
import ThemeProvider from '@/components/ThemeProvider'
import { getSiteConfig } from '@/lib/api'
import { routing } from '@/i18n/routing'
import { SiteJsonLd } from '@/components/JsonLd'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.new-universe.cn'

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
      canonical: `${SITE_URL}/${locale}`,
      languages: {
        zh: `${SITE_URL}/zh`,
        en: `${SITE_URL}/en`,
      },
      types: { 'application/rss+xml': `${SITE_URL}/feed.xml` },
    },
    openGraph: {
      title: config.seo.defaultTitle || config.siteName,
      description: config.seo.defaultDescription || config.siteDescription,
      url: `${SITE_URL}/${locale}`,
      siteName: config.siteName,
      type: 'website',
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
      ...(config.seo.defaultOgImage ? { images: [{ url: config.seo.defaultOgImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: config.seo.defaultTitle || config.siteName,
      description: config.seo.defaultDescription || config.siteDescription,
      ...(config.seo.defaultOgImage ? { images: [config.seo.defaultOgImage] } : {}),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: '7U2ecxnFXB_TBWt1YymA6odAvoozyQ-CTxJg-P7D_44',
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

  const configuredGA = config.analyticsGoogle || process.env.NEXT_PUBLIC_GA_ID || ''
  const GA_ID = /^G-[A-Z0-9]+$/.test(configuredGA) ? configuredGA : ''
  const baiduId = /^[a-f0-9]{32}$/i.test(config.analyticsBaidu || '') ? config.analyticsBaidu : null

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* 防止暗黑模式 hydration 闪烁 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||((t==='system'||!t)&&prefersDark)){document.documentElement.classList.add('dark');}}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-[#FBF9F5]`}
      >
        {baiduId && <Script src={`https://hm.baidu.com/hm.js?${baiduId}`} strategy="afterInteractive" />}
        {GA_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
            </Script>
          </>
        ) : null}
        <SiteJsonLd config={config} />
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <LetterDeliveryProvider>
              <StudyShell locale={locale}>{children}</StudyShell>
            </LetterDeliveryProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
        {process.env.VERCEL === '1' && <Analytics />}
        <SiteAnalytics />
      </body>
    </html>
  )
}
