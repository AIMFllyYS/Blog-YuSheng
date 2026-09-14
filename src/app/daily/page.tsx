import type { Metadata } from 'next'
import { DailyBriefIndex } from '@/features/daily-brief'
import { listBriefs } from '@/server/briefs'

export const metadata: Metadata = {
  title: '小日报 · 折晓早报台历',
  description: '每天清晨由电子分身折好的一份 AI 早报，按月归档、按周翻阅。',
}

export default async function DailyPage() {
  const briefs = await listBriefs()
  return <DailyBriefIndex briefs={briefs} />
}
