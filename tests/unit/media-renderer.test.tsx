import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  BUILTIN_RENDERER_REGISTRY,
  compileArticleDocumentWithDiagnostics,
  compileDocument,
  projectPackageMediaUrl,
  projectRendererNode,
  type RegisteredComponentNode,
} from '../../src/features/doc-engine'
import { MediaPlayer } from '../../src/features/doc-engine/renderers/media/media-player'

const ARTICLE_SLUG = 'media-renderer-unit'
const SOURCE = [
  '<video-embed id="demo-video" src="./media/video/demo.mp4" title="演示视频" poster="./media/images/海报 poster.png" />',
  '',
  '<audio-embed id="demo-audio" src="./media/audio/demo.mp3" title="演示音频" />',
].join('\n')
const MANIFEST = [
  entry('media/video/demo.mp4'),
  entry('media/images/海报 poster.png'),
  entry('media/audio/demo.mp3'),
] as const

describe('video and audio renderers', () => {
  it('registers strict article projections and collects package assets', async () => {
    const [video, audio] = await mediaNodes()
    const videoDefinition = BUILTIN_RENDERER_REGISTRY.get('video-embed')
    const audioDefinition = BUILTIN_RENDERER_REGISTRY.get('audio-embed')

    expect(videoDefinition?.allowedProfiles).toEqual(['article', 'editor-preview'])
    expect(audioDefinition?.allowedProfiles).toEqual(['article', 'editor-preview'])
    expect(videoDefinition?.discussionCandidate).toBe(false)
    expect(audioDefinition?.discussionCandidate).toBe(false)
    expect(videoDefinition?.renderScreen(video, { profile: 'article' })).toEqual({
      kind: 'server-screen-projection',
      rendererName: 'video-embed',
      nodeId: video.nodeId,
    })
    expect(audioDefinition?.renderScreen(audio, { profile: 'article' })).toEqual({
      kind: 'server-screen-projection',
      rendererName: 'audio-embed',
      nodeId: audio.nodeId,
    })
    expect(videoDefinition?.collectAssets(video)).toEqual([
      { source: './media/video/demo.mp4', kind: 'local', attribute: 'src' },
      {
        source: './media/images/海报 poster.png',
        kind: 'local',
        attribute: 'poster',
      },
    ])
    expect(audioDefinition?.collectAssets(audio)).toEqual([
      { source: './media/audio/demo.mp3', kind: 'local', attribute: 'src' },
    ])
  })

  it('renders native controls without autoplay and keeps whole-node selection', async () => {
    const [video, audio] = await mediaNodes()
    const videoHtml = renderToStaticMarkup(
      <MediaPlayer
        kind="video"
        node={video}
        poster={projectPackageMediaUrl(
          String(video.attributes.poster),
          ARTICLE_SLUG,
          MANIFEST,
        )}
        showDetails
        src={projectPackageMediaUrl(
          String(video.attributes.src),
          ARTICLE_SLUG,
          MANIFEST,
        )}
        title={String(video.attributes.title)}
      />,
    )
    const audioHtml = renderToStaticMarkup(
      <MediaPlayer
        kind="audio"
        node={audio}
        showDetails
        src={projectPackageMediaUrl(
          String(audio.attributes.src),
          ARTICLE_SLUG,
          MANIFEST,
        )}
        title={String(audio.attributes.title)}
      />,
    )

    expect(videoHtml).toContain('<video')
    expect(videoHtml).toContain('controls=""')
    expect(videoHtml).not.toContain('autoplay')
    expect(videoHtml).toContain('aria-label="播放演示视频"')
    expect(videoHtml).toContain('motion-reduce:transition-none')
    expect(videoHtml).toContain('motion-reduce:hover:scale-100')
    expect(videoHtml).toContain(
      'poster="/blog/media-renderer-unit/media/images/%E6%B5%B7%E6%8A%A5%20poster.png"',
    )
    expect(videoHtml).toContain('data-selectable="none"')
    expect(audioHtml).toContain('<audio')
    expect(audioHtml).toContain('controls=""')
    expect(audioHtml).not.toContain('autoplay')
    expect(audioHtml).toContain('演示音频')
  })

  it('preserves exact Markdown and projects readable TXT with title and URL', async () => {
    const [video, audio] = await mediaNodes()
    const videoDefinition = BUILTIN_RENDERER_REGISTRY.get('video-embed')!
    const audioDefinition = BUILTIN_RENDERER_REGISTRY.get('audio-embed')!

    expect(projectRendererNode(videoDefinition, 'markdown', video).value).toBe(
      SOURCE.split('\n')[0],
    )
    expect(projectRendererNode(audioDefinition, 'markdown', audio).value).toBe(
      SOURCE.split('\n')[2],
    )
    expect(projectRendererNode(videoDefinition, 'text', video).value).toBe(
      '【视频】演示视频：./media/video/demo.mp4',
    )
    expect(projectRendererNode(audioDefinition, 'text', audio).value).toBe(
      '【音频】演示音频：./media/audio/demo.mp3',
    )
  })

  it('reports missing required title and missing package resources deterministically', async () => {
    const invalid = await compileArticleDocumentWithDiagnostics({
      articleSlug: ARTICLE_SLUG,
      assetManifest: [],
      frontmatter: {},
      source:
        '<video-embed id="missing-title" src="./media/video/demo.mp4" />',
    })
    const missing = await compileArticleDocumentWithDiagnostics({
      articleSlug: ARTICLE_SLUG,
      assetManifest: [],
      frontmatter: {},
      source:
        '<audio-embed id="missing-file" src="./media/audio/missing.mp3" title="缺失音频" />',
    })

    expect(invalid.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'DOC-REGISTRY-002',
        sourceRange: expect.any(Object),
      }),
    )
    expect(missing.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'DOC-ASSET-002',
        buildBlocking: true,
        message: expect.stringContaining('./media/audio/missing.mp3'),
        sourceRange: expect.any(Object),
      }),
    )
  })
})

async function mediaNodes(): Promise<
  readonly [RegisteredComponentNode, RegisteredComponentNode]
> {
  const { document, diagnostics } = await compileDocument({
    articleSlug: ARTICLE_SLUG,
    assetManifest: MANIFEST,
    frontmatter: {},
    source: SOURCE,
  })
  expect(diagnostics).toEqual([])
  const [video, audio] = document.root.children
  if (
    video?.type !== 'registeredComponent' ||
    video.name !== 'video-embed' ||
    audio?.type !== 'registeredComponent' ||
    audio.name !== 'audio-embed'
  ) {
    throw new Error('fixture 未编译为媒体组件')
  }
  return [video, audio]
}

function entry(relativePath: string) {
  return {
    articleSlug: ARTICLE_SLUG,
    outputPath: `blog/${ARTICLE_SLUG}/${relativePath}`,
    publicUrl: `/blog/${ARTICLE_SLUG}/${relativePath}`,
  }
}
