import 'server-only'

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  assertDocumentBuildCanContinue,
  compileArticleDocumentWithDiagnostics,
} from '../../features/doc-engine/core'
import { buildSelectionIndex, type SelectionDocumentIndex } from '../../features/doc-engine/selection'
import { ContentBuildError } from './content-error'
import { createBlogStaticParams } from './create-static-params'
import { readPost } from './read-post'
import {
  createAssetManifest,
  type AssetManifestEntry,
} from './asset-manifest'
import { transformContentImages } from './transform-content-images'

/**
 * Read-only anchor manifest emitted at build time (spec §10). P0 produces
 * the artifact next to each article; P1 write paths validate article /
 * fingerprint / block / offset / exact server-side against it instead of
 * trusting client claims.
 */
export type AnchorManifest = SelectionDocumentIndex & {
  readonly protocolVersion: 'text-anchor-v1'
}

export async function createAnchorManifest(
  articleSlug: string,
  assetManifest: readonly AssetManifestEntry[],
  postsRoot?: string,
): Promise<AnchorManifest> {
  const post = await readPost(articleSlug, postsRoot)
  const compiled = await compileArticleDocumentWithDiagnostics({
    articleSlug,
    assetManifest,
    frontmatter: post.frontmatter,
    source: post.source,
  })
  assertDocumentBuildCanContinue(compiled.diagnostics)
  return {
    protocolVersion: 'text-anchor-v1',
    ...buildSelectionIndex(compiled.document),
  }
}

/** Write `anchor-manifest.json` next to every generated article in `out/`. */
export async function writeAnchorManifests(
  outputRoot = path.join(process.cwd(), 'out'),
): Promise<readonly string[]> {
  const params = await createBlogStaticParams()
  const assetManifest = await transformContentImages(await createAssetManifest())
  const written: string[] = []
  for (const { slug } of params) {
    const manifest = await createAnchorManifest(slug, assetManifest)
    const destination = path.join(outputRoot, 'blog', slug, 'anchor-manifest.json')
    const relative = path.relative(path.resolve(outputRoot), path.resolve(destination))
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new ContentBuildError('锚点 manifest 输出路径越界', [])
    }
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    written.push(relative)
  }
  return written
}
