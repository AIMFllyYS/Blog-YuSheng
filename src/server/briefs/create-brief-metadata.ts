import 'server-only'

import type { Metadata } from 'next'
import { formatBriefDateLong } from '../../features/daily-brief/brief-date'
import { listBriefs, readBrief } from './discover-briefs'

export async function createBriefMetadata(date: string): Promise<Metadata> {
  const brief = await readBrief(date)
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
  return (await listBriefs()).map((brief) => ({ date: brief.date }))
}
