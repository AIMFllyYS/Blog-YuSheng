import type { Metadata } from 'next'
import { NotesPage } from '@/features/notes'

export const metadata: Metadata = {
  title: '随笔 · 建设中',
  description: '短随笔与生活记录，正在建设。',
}

export default function Page() {
  return <NotesPage />
}
