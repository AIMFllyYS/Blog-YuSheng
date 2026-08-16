import type { Metadata } from 'next'
import { CloudSerifFont } from '@/components/cloud-serif-font'
import { DEFAULT_THEME, getJourneyStyle, getThemeStyle } from '@/lib/theme'
import './globals.css'

export const metadata: Metadata = {
  title: '羽升 · YuSheng｜羽化成蝶，升生不息',
  description:
    '羽升的个人博客与电子分身：记录 AI 成长、技术判断、作品与仍在生长的思考。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      data-theme={DEFAULT_THEME}
      lang="zh-CN"
      style={{ ...getThemeStyle(DEFAULT_THEME), ...getJourneyStyle() }}
    >
      <body className="antialiased">
        <CloudSerifFont />
        {children}
      </body>
    </html>
  )
}
