import 'server-only'

import { createAssetManifest, type AssetManifestEntry } from './asset-manifest'
import { mirrorAssetsForDev } from './dev-asset-mirror'
import { transformContentImages } from './transform-content-images'

/**
 * The single render-time source of article asset URLs. Awaiting the dev mirror
 * before returning guarantees the bytes are on disk before any HTML referencing
 * them reaches the browser, so the first request already resolves.
 */
export async function getRenderAssetManifest(
  cacheRoot?: string,
): Promise<readonly AssetManifestEntry[]> {
  const manifest = await transformContentImages(
    await createAssetManifest(),
    cacheRoot,
  )
  await mirrorAssetsForDev(manifest)
  return manifest
}
