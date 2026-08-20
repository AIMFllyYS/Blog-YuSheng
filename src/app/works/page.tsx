import type { Metadata } from 'next'
import { WorksPage } from '@/features/works'

export const metadata: Metadata = {
  title: '作品集 · 建设中',
  description: '项目与作品展示，正在建设。',
}

export default function Page() {
  return <WorksPage />
}
