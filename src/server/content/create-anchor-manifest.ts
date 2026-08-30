import 'server-only'

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  assertDocumentBuildCanContinue,
  compileArticleDocumentWithDiagnostics,
  type CompiledDocument,
} from '../../features/doc-engine/core'
import { buildSelectionIndex, type SelectionDocumentIndex } from '../../features/doc-engine/selection'
import {
  ARTICLE_EXPORT_SOURCE_SCHEMA_VERSION,
  type ArticleExportSource,
} from '../../features/export-service/export-source'
import { projectDocumentText } from '../../features/export-service/text/project-text'
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
    assetManifest: assetManifest.filter(
      (entry) => entry.articleSlug === articleSlug,
    ),
    frontmatter: post.frontmatter,
    source: post.source,
  })
  assertDocumentBuildCanContinue(compiled.diagnostics)
  return {
    protocolVersion: 'text-anchor-v1',
    ...buildSelectionIndex(compiled.document),
  }
}

export function createExportSource(
  document: CompiledDocument,
): ArticleExportSource {
  return {
    schemaVersion: ARTICLE_EXPORT_SOURCE_SCHEMA_VERSION,
    articleSlug: document.articleSlug,
    documentFingerprint: document.documentFingerprint,
    originalSource: document.originalSource,
    plainText: projectDocumentText(document),
  }
}

export async function writeArticleSidecarFiles(
  outputRoot: string,
  articleSlug: string,
  document: CompiledDocument,
): Promise<readonly string[]> {
  const manifest: AnchorManifest = {
    protocolVersion: 'text-anchor-v1',
    ...buildSelectionIndex(document),
  }
  const exportSource = createExportSource(document)
  return Promise.all([
    writeJsonSidecar(
      outputRoot,
      articleSlug,
      'anchor-manifest.json',
      manifest,
      '锚点 manifest 输出路径越界',
    ),
    writeJsonSidecar(
      outputRoot,
      articleSlug,
      'export-source.json',
      exportSource,
      '导出源码 sidecar 输出路径越界',
    ),
  ])
}

export async function mirrorArticleSidecarsForDev(document: CompiledDocument) {
  if (process.env.NODE_ENV !== 'development') return
  await writeArticleSidecarFiles(
    path.join(process.cwd(), 'public'),
    document.articleSlug,
    document,
  )
}

/** Write `anchor-manifest.json` and `export-source.json` beside every generated article in `out/`. */
export async function writeAnchorManifests(
  outputRoot = path.join(process.cwd(), 'out'),
): Promise<readonly string[]> {
  const params = await createBlogStaticParams()
  const assetManifest = await transformContentImages(await createAssetManifest())
  const written: string[] = []
  for (const { slug } of params) {
    const post = await readPost(slug)
    const articleAssets = assetManifest.filter(
      (entry) => entry.articleSlug === slug,
    )
    const compiled = await compileArticleDocumentWithDiagnostics({
      articleSlug: slug,
      assetManifest: articleAssets,
      frontmatter: post.frontmatter,
      source: post.source,
    })
    assertDocumentBuildCanContinue(compiled.diagnostics)
    written.push(
      ...(await writeArticleSidecarFiles(outputRoot, slug, compiled.document)),
    )
  }
  return written
}

async function writeJsonSidecar(
  outputRoot: string,
  articleSlug: string,
  fileName: string,
  payload: unknown,
  overflowMessage: string,
) {
  const destination = path.join(outputRoot, 'blog', articleSlug, fileName)
  const relative = path.relative(path.resolve(outputRoot), path.resolve(destination))
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new ContentBuildError(overflowMessage, [])
  }
  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(destination, `${JSON.stringify(payload)}\n`, 'utf8')
  return relative
}
