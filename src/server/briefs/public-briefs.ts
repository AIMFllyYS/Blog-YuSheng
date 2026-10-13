import 'server-only'

import { CONTENT_BRIEFS_ROOT } from './brief-paths'
import { discoverBriefs, type DiscoveredBrief } from './discover-briefs'
import { isSameContentRoot, readVisibility } from '../visibility/read-visibility'

export async function listPublicDiscoveredBriefs(
  root?: string,
  hiddenDates?: readonly string[],
): Promise<readonly DiscoveredBrief[]> {
  const discovered = await discoverBriefs(root)
  const hidden = await hiddenBriefDates(root, hiddenDates)
  return discovered.filter((item) => !hidden.has(item.entry.date))
}

export async function listPublicBriefs(
  root?: string,
  hiddenDates?: readonly string[],
) {
  return (await listPublicDiscoveredBriefs(root, hiddenDates)).map(
    (item) => item.entry,
  )
}

async function hiddenBriefDates(
  root: string | undefined,
  hiddenDates: readonly string[] | undefined,
) {
  if (hiddenDates) return new Set(hiddenDates)
  if (!isSameContentRoot(root, CONTENT_BRIEFS_ROOT)) return new Set<string>()
  return new Set((await readVisibility()).briefs)
}
