'use client'

import { useEffect, useState } from 'react'
import type { TocItem } from '@/lib/toc'

const indentMap: Record<number, string> = {
  1: 'pl-0',
  2: 'pl-3',
  3: 'pl-6',
}

export default function ArticleToc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    const headings = document.querySelectorAll('h1, h2, h3')
    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length === 0) return

        let closest = visible[0]
        for (const entry of visible) {
          if (entry.boundingClientRect.top < closest.boundingClientRect.top) {
            closest = entry
          }
        }
        const id = closest.target.getAttribute('id')
        if (id) setActiveId(id)
      },
      { rootMargin: '0px 0px -80% 0px' },
    )

    headings.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  if (items.length === 0) return null

  return (
    <div className="hidden lg:block fixed top-24 right-8 w-56">
      <nav>
        <ul className="space-y-1 text-sm">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  document
                    .getElementById(item.id)
                    ?.scrollIntoView({ behavior: 'smooth' })
                  setActiveId(item.id)
                }}
                className={`block py-0.5 ${indentMap[item.level]} ${
                  activeId === item.id
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
