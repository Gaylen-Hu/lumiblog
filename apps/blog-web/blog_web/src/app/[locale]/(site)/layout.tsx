import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getSiteConfig } from '@/lib/api'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const config = await getSiteConfig()
  return <>
    <Header siteName={config.siteName} />
    <main className="flex-1 pt-20">{children}</main>
    <Footer siteName={config.siteName} siteDescription={config.siteDescription}
      socialLinks={config.socialLinks} filing={config.filing} email={config.owner.email} />
  </>
}
