import type { Metadata } from 'next'
import Link from 'next/link'
import { CopyButton } from '@/components/CopyButton'

export const metadata: Metadata = {
  title: 'RSS 订阅 - NOVA',
  description: '通过 RSS 订阅 NOVA 博客，获取最新文章更新。',
}

const RSS_ICON = (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z" />
  </svg>
)

const readers = [
  { name: 'Feedly', url: 'https://feedly.com', description: '流行的在线 RSS 阅读器' },
  { name: 'Inoreader', url: 'https://www.inoreader.com', description: '功能强大的 RSS 服务' },
  { name: 'NetNewsWire', url: 'https://netnewswire.com', description: 'macOS/iOS 免费开源阅读器' },
  { name: 'Reeder', url: 'https://reederapp.com', description: 'Apple 平台精美阅读器' },
]

export default function RSSPage() {
  const feedUrl = '/feed.xml'

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 mb-6">
            {RSS_ICON}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[#111111] mb-4">
            RSS 订阅
          </h1>
          <p className="text-lg text-[#555555] font-light max-w-lg mx-auto">
            通过 RSS 订阅，在你喜欢的阅读器中获取 NOVA 的最新文章更新。
          </p>
        </div>

        {/* Feed URL */}
        <div className="bg-gray-50 rounded-2xl p-8 mb-12">
          <h2 className="text-sm font-semibold text-[#111111] uppercase tracking-wider mb-4">
            订阅地址
          </h2>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-white px-4 py-3 rounded-lg text-sm text-[#555555] font-mono border border-gray-100 overflow-x-auto">
              {feedUrl}
            </code>
            <CopyButton text={feedUrl} />
          </div>
          <p className="mt-4 text-sm text-gray-400">
            复制上方链接，粘贴到你的 RSS 阅读器中即可订阅。
          </p>
        </div>

        {/* Quick Subscribe */}
        <div className="mb-12">
          <h2 className="text-sm font-semibold text-[#111111] uppercase tracking-wider mb-6">
            快速订阅
          </h2>
          <Link
            href={feedUrl}
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            {RSS_ICON}
            <span>打开 RSS Feed</span>
          </Link>
        </div>

        {/* Recommended Readers */}
        <div className="mb-12">
          <h2 className="text-sm font-semibold text-[#111111] uppercase tracking-wider mb-6">
            推荐阅读器
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {readers.map((reader) => (
              <a
                key={reader.name}
                href={reader.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <h3 className="font-medium text-[#111111] group-hover:text-orange-500 transition-colors">
                  {reader.name}
                </h3>
                <p className="text-sm text-[#555555] mt-1">{reader.description}</p>
              </a>
            ))}
          </div>
        </div>

        {/* What is RSS */}
        <div className="border-t border-gray-100 pt-12">
          <h2 className="text-sm font-semibold text-[#111111] uppercase tracking-wider mb-4">
            什么是 RSS？
          </h2>
          <p className="text-[#555555] font-light leading-relaxed">
            RSS（Really Simple Syndication）是一种内容聚合格式，让你可以在一个地方订阅和阅读多个网站的更新。
            使用 RSS 阅读器，你可以摆脱算法推荐，按照自己的节奏阅读感兴趣的内容。
          </p>
        </div>

        {/* Back Link */}
        <div className="mt-16 text-center">
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-[#111111] transition-colors"
          >
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
