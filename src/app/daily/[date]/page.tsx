import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BriefReader } from '@/features/daily-brief'
import {
  createBriefMetadata,
  createBriefStaticParams,
  discoverBriefs,
  mirrorBriefsForDev,
} from '@/server/briefs'

type Props = { params: Promise<{ date: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return createBriefStaticParams()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params
  return createBriefMetadata(date)
}

export default async function DailyBriefPage({ params }: Props) {
  const { date } = await params
  const briefs = await discoverBriefs()
  const index = briefs.findIndex((item) => item.entry.date === date)
  if (index === -1) notFound()
  await mirrorBriefsForDev([briefs[index]!])
  return (
    <BriefReader
      brief={briefs[index]!.entry}
      newer={briefs[index - 1]?.entry}
      older={briefs[index + 1]?.entry}
      issue={briefs.length - index}
    />
  )
}
