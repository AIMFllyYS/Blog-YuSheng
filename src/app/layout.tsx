import type { Metadata } from 'next'
import { CloudSerifFont } from '@/components/cloud-serif-font'
import { getDocumentThemeCss, getThemeBootScript } from '@/lib/theme'
import { AppProviders } from './app-providers'
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
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: getDocumentThemeCss() }} />
        <script dangerouslySetInnerHTML={{ __html: getThemeBootScript() }} />
      </head>
      <body className="antialiased">
        <CloudSerifFont />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
