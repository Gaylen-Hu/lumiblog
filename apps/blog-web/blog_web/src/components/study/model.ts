export const destinations = ['bookshelf', 'diary', 'computer', 'portrait'] as const
export type Destination = typeof destinations[number]
export function isDestination(value: string | null): value is Destination {
  return destinations.includes(value as Destination)
}
export const labels = {
  zh: { bookshelf: '书架 · 文章', diary: '日记 · 日常', computer: '电脑 · 作品', portrait: '相片 · 关于我' },
  en: { bookshelf: 'Bookshelf · Writing', diary: 'Journal · Life', computer: 'Laptop · Projects', portrait: 'Photograph · About' },
}
