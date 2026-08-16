import { z } from 'zod'

import type { DocumentNode } from '../core'
import { CODE_RENDERER_DEFINITION } from '../renderers/code'
import { KATEX_RENDERER_DEFINITION } from '../renderers/katex'
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

const COMPONENT_SCHEMAS = {
  'video-embed': z
    .object({ id: z.string(), src: z.string(), title: z.string(), poster: z.string().optional() })
    .strict(),
  'audio-embed': z
    .object({ id: z.string(), src: z.string(), title: z.string() })
    .strict(),
  'canvas-render': z
    .object({
      id: z.string(),
      renderer: z.string(),
      'data-src': z.string().optional(),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
    })
    .strict(),
  'svg-embed': z
    .object({ id: z.string(), src: z.string(), title: z.string() })
    .strict(),
  'html-embed': z
    .object({ id: z.string(), src: z.string(), title: z.string(), height: z.number().int().positive().optional() })
    .strict(),
  'web-embed': z
    .object({ id: z.string(), src: z.string(), title: z.string(), height: z.number().int().positive().optional() })
    .strict(),
  'choice-question': z.object({ id: z.string(), 'data-src': z.string() }).strict(),
  'fill-blank-question': z.object({ id: z.string(), 'data-src': z.string() }).strict(),
} as const

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
    collectAssets: () => [],
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
  createDefinition('mermaid', { selectable: 'none' }),
  createDefinition('image', { allowsExternalResource: true, selectable: 'whole-node' }),
  createDefinition('video-embed', {
    schema: COMPONENT_SCHEMAS['video-embed'],
    allowsExternalResource: true,
    selectable: 'none',
  }),
  createDefinition('audio-embed', {
    schema: COMPONENT_SCHEMAS['audio-embed'],
    allowsExternalResource: true,
    selectable: 'none',
  }),
  createDefinition('canvas-render', {
    schema: COMPONENT_SCHEMAS['canvas-render'],
    trustLevel: 'registered',
    allowsScript: true,
    selectable: 'none',
  }),
  createDefinition('svg-embed', {
    schema: COMPONENT_SCHEMAS['svg-embed'],
    trustLevel: 'registered',
    selectable: 'none',
  }),
  createDefinition('html-embed', {
    schema: COMPONENT_SCHEMAS['html-embed'],
    trustLevel: 'sandboxed',
    allowsScript: true,
    selectable: 'none',
  }),
  createDefinition('web-embed', {
    schema: COMPONENT_SCHEMAS['web-embed'],
    trustLevel: 'sandboxed',
    allowsExternalResource: true,
    selectable: 'none',
  }),
  createDefinition('choice-question', {
    schema: COMPONENT_SCHEMAS['choice-question'],
    trustLevel: 'registered',
    selectable: 'none',
  }),
  createDefinition('fill-blank-question', {
    schema: COMPONENT_SCHEMAS['fill-blank-question'],
    trustLevel: 'registered',
    selectable: 'none',
  }),
])

export const BUILTIN_RENDERER_REGISTRY = new RendererRegistry(DEFINITIONS)
