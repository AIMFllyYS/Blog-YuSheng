import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '羽升 · YuSheng · 电子分身 | 占位启航',
  description: '羽升 YuSheng 的个人博客 —— 记录 AI 成长、沉淀方法论、构建电子分身。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
