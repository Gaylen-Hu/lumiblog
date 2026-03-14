// 根 layout：仅为 [locale] 子路由提供最小包装
// 实际的 html/body/providers 在 [locale]/layout.tsx 中
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
