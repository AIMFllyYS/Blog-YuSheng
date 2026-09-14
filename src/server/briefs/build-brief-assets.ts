import 'server-only'

import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { briefOutputPath } from './brief-paths'
import { discoverBriefs, type DiscoveredBrief } from './discover-briefs'

/**
 * 把 `content/briefs/**` 的原件原样复制到 `out/briefs/<date>.html`。
 * 由 postbuild（`scripts/build/run-brief-assets.test.ts`）调用，与文章资产搬运同一时机。
 */
export async function buildBriefAssets(
  outputRoot = path.join(process.cwd(), 'out'),
): Promise<readonly DiscoveredBrief[]> {
  const briefs = await discoverBriefs()
  await copyBriefs(briefs, outputRoot)
  return briefs
}

/** 开发态把原件镜像到 `public/briefs/`（gitignore），让 `next dev` 直接可访问 */
export async function mirrorBriefsForDev(
  briefs: readonly DiscoveredBrief[],
): Promise<void> {
  if (process.env.NODE_ENV !== 'development') return
  await copyBriefs(briefs, path.join(process.cwd(), 'public'))
}

export async function copyBriefs(
  briefs: readonly DiscoveredBrief[],
  outputRoot: string,
): Promise<void> {
  const resolvedRoot = path.resolve(outputRoot)
  for (const brief of briefs) {
    const destination = path.resolve(resolvedRoot, briefOutputPath(brief.entry.date))
    const relative = path.relative(resolvedRoot, destination)
    if (
      relative === '..' ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    ) {
      throw new Error(`小日报目标路径越界：${destination}`)
    }
    await mkdir(path.dirname(destination), { recursive: true })
    await copyFile(brief.sourcePath, destination)
  }
}
