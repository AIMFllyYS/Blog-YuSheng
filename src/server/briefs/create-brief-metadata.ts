import 'server-only'

import type { Metadata } from 'next'
import { formatBriefDateLong } from '../../features/daily-brief/brief-date'
import { listPublicBriefs } from './public-briefs'

export async function createBriefMetadata(date: string): Promise<Metadata> {
  const brief = (await listPublicBriefs()).find((item) => item.date === date)
  if (!brief) return { title: '找不到这期早报' }
  const title = `${brief.headline} · 折晓早报 ${brief.date}`
  const description =
    brief.thesis ?? `${formatBriefDateLong(brief)} 的 AI 小日报：${brief.title}`
  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
  }
}

export async function createBriefStaticParams(): Promise<{ date: string }[]> {
  return (await listPublicBriefs()).map((brief) => ({ date: brief.date }))
}
