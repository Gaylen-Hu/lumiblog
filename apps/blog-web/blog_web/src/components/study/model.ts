export const destinations = ['bookshelf', 'columns', 'diary', 'computer', 'album', 'portrait', 'drawer', 'readingBox'] as const
export type Destination = typeof destinations[number]
export type RoomDetail = 'tea' | 'note'
export type ClockView = 'room' | 'approaching' | 'observing' | 'returning'
export type RoomItem = Destination | RoomDetail | 'lamp' | 'ceilingLight' | 'clock' | 'curtains' | 'bookmark'
export function isDestination(value: string | null): value is Destination {
  return destinations.includes(value as Destination)
}
export const labels = {
  zh: { bookshelf: '书架 · 文章', columns: '钟下小书架 · 专栏', diary: '日记 · 日常', computer: '电脑 · 作品', album: '中央画框 · 相册', portrait: '相片 · 关于我', drawer: '抽屉 · 收藏', readingBox: '书柜盒子 · 待阅匣' },
  en: { bookshelf: 'Bookshelf · Writing', columns: 'Clock shelf · Series', diary: 'Journal · Life', computer: 'Laptop · Projects', album: 'Framed print · Photo album', portrait: 'Photograph · About', drawer: 'Drawer · Collections', readingBox: 'Shelf box · Read later' },
}
export const itemLabels = {
  zh: { ...labels.zh, clock: '挂钟 · 看时间', lamp: '台灯 · 开关灯', note: '手写便签', bookmark: '续读书签',
    ceilingLight: '墙上开关 · 书房大灯', curtains: '窗边 · 开合窗帘', tea: '杯子 · 茶歇随读' },
  en: { ...labels.en, clock: 'Clock · Tell time', lamp: 'Lamp · Switch light', note: 'Desk note', bookmark: 'Reading ribbon',
    ceilingLight: 'Wall switch · Ceiling light', curtains: 'Window · Draw curtains', tea: 'Cup · A tea-break read' },
} satisfies Record<'zh' | 'en', Record<RoomItem, string>>
