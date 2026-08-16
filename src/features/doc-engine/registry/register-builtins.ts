import type { DocumentNode } from '../core'
import { CODE_RENDERER_DEFINITION } from '../renderers/code'
import { KATEX_RENDERER_DEFINITION } from '../renderers/katex'
import { IMAGE_RENDERER_DEFINITION } from '../renderers/image'
import { MERMAID_RENDERER_DEFINITION } from '../renderers/mermaid'
import { VIDEO_RENDERER_DEFINITION } from '../renderers/video'
import { AUDIO_RENDERER_DEFINITION } from '../renderers/audio'
import { CANVAS_RENDERER_DEFINITION } from '../renderers/canvas'
import { SVG_RENDERER_DEFINITION } from '../renderers/svg'
import { HTML_RENDERER_DEFINITION } from '../renderers/html'
import { WEB_RENDERER_DEFINITION } from '../renderers/web'
import { CHOICE_QUESTION_RENDERER_DEFINITION } from '../renderers/quiz-choice'
import { FILL_BLANK_QUESTION_RENDERER_DEFINITION } from '../renderers/quiz-fill'
import { RendererRegistry } from './renderer-registry'
import type {
  RenderProfile,
  RendererDefinition,
} from './renderer-definition'

const ALL_SCREEN_PROFILES = [
  'article',
  'discussion',
  'editor-preview',
] as const satisfies readonly RenderProfile[]
const ARTICLE_PROFILES = [
  'article',
  'editor-preview',
] as const satisfies readonly RenderProfile[]

const safeBuiltins = new Set(['markdown', 'code', 'katex', 'mermaid'])

import { z } from 'zod'

const EMPTY_SCHEMA = z.object({}).strict()

function fallbackValue(name: string, node: DocumentNode): Readonly<Record<string, unknown>> {
  return Object.freeze({
    kind: 'renderer-fallback',
    renderer: name,
    nodeId: node.nodeId,
    text: node.canonicalText ?? '',
  })
}

function createDefinition(
  name: string,
  options: {
    schema?: RendererDefinition['schema']
    trustLevel?: RendererDefinition['security']['trustLevel']
    allowsScript?: boolean
    allowsExternalResource?: boolean
    assetAttributes?: readonly string[]
    selectable?: RendererDefinition['selectable']
  } = {},
): RendererDefinition {
  const discussionCandidate = safeBuiltins.has(name)
  const schema = options.schema ?? EMPTY_SCHEMA
  return {
    name,
    version: 1,
    allowedProfiles: discussionCandidate ? ALL_SCREEN_PROFILES : ARTICLE_PROFILES,
    discussionCandidate,
    schema,
    compile: (attributes) => {
      const parsed = schema.safeParse(attributes)
      if (!parsed.success) throw new Error(`${name} renderer 属性未通过 schema。`)
      return parsed.data
    },
    collectAssets: (node) =>
      Object.freeze(
        (options.assetAttributes ?? []).flatMap((attribute) => {
          const source = node.attributes[attribute]
          return typeof source === 'string'
            ? [{ source, kind: 'local' as const, attribute }]
            : []
        }),
      ),
    renderScreen: (node) => fallbackValue(name, node),
    renderFallback: (node) => fallbackValue(name, node),
    security: {
      trustLevel: options.trustLevel ?? 'native',
      allowsScript: options.allowsScript ?? false,
      allowsExternalResource: options.allowsExternalResource ?? false,
    },
    selectable: options.selectable ?? 'text-range',
  }
}

const DEFINITIONS: readonly RendererDefinition[] = Object.freeze([
  createDefinition('markdown'),
  CODE_RENDERER_DEFINITION,
  KATEX_RENDERER_DEFINITION,
  MERMAID_RENDERER_DEFINITION,
  IMAGE_RENDERER_DEFINITION,
  VIDEO_RENDERER_DEFINITION,
  AUDIO_RENDERER_DEFINITION,
  CANVAS_RENDERER_DEFINITION,
  SVG_RENDERER_DEFINITION,
  HTML_RENDERER_DEFINITION,
  WEB_RENDERER_DEFINITION,
  CHOICE_QUESTION_RENDERER_DEFINITION,
  FILL_BLANK_QUESTION_RENDERER_DEFINITION,
])

export const BUILTIN_RENDERER_REGISTRY = new RendererRegistry(DEFINITIONS)
