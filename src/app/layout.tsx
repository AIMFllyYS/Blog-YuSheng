import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '羽升 YuSheng · 电子分身',
  description: '羽升 YuSheng 的个人博客 —— 羽化成蝶，升生不息。记录 AI 成长、沉淀方法论、构建电子分身。',
}

export const viewport: Viewport = {
  themeColor: '#05070f',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" data-theme="paper">
      <body>{children}</body>
    </html>
  )
}
