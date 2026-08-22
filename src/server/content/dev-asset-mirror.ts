import 'server-only'

import { stat } from 'node:fs/promises'
import path from 'node:path'

import type { AssetManifestEntry } from './asset-manifest'
import { copyAssetManifest } from './build-content-assets'

/**
 * Article package assets are only materialised into `out/` by the production
 * build, so during `pnpm dev` every projected asset URL would 404. Next dev
 * serves static files exclusively from `public/`, matching them by exact file
 * path, so mirroring the manifest there is the only way to make the very same
 * URLs resolve locally.
 *
 * Mirrored top-level directories are `blog/`, `media/` and `embeds/<slug>/`;
 * keep them in sync with the pre-build cleanup in
 * `scripts/build/run-next-build.mjs`.
 */
function devMirrorRoot(): string {
  return path.join(process.cwd(), 'public')
}

let pending: Promise<void> = Promise.resolve()

export function mirrorAssetsForDev(
  manifest: readonly AssetManifestEntry[],
): Promise<void> {
  if (process.env.NODE_ENV === 'production') return Promise.resolve()
  // Serialise passes so two concurrent dev requests never write the same
  // destination at once and hand the browser a torn file.
  pending = pending.catch(() => undefined).then(() => mirrorOnce(manifest))
  return pending
}

async function mirrorOnce(manifest: readonly AssetManifestEntry[]) {
  const outputRoot = devMirrorRoot()
  const outdated: AssetManifestEntry[] = []
  for (const entry of manifest) {
    if (!(await isMirrored(entry, outputRoot))) outdated.push(entry)
  }
  if (outdated.length === 0) return
  await copyAssetManifest(outdated, outputRoot)
}

async function isMirrored(entry: AssetManifestEntry, outputRoot: string) {
  try {
    const [source, mirrored] = await Promise.all([
      stat(entry.sourcePath),
      stat(path.resolve(outputRoot, entry.outputPath)),
    ])
    if (mirrored.mtimeMs < source.mtimeMs) return false
    // Sanitising rewrites the bytes, so only the mirror timestamp can be
    // compared for those entries.
    return entry.transform === 'sanitize-svg' || mirrored.size === source.size
  } catch {
    return false
  }
}
