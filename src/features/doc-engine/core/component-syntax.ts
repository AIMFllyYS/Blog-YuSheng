import type { SourceRange } from './document-types'

type ComponentPlacement = 'block' | 'inline' | 'slot'
type ComponentContent = 'none' | 'fallback-text' | 'flow' | 'phrasing' | 'slots'

const COMPONENT_SCHEMAS = {
  'video-embed': {
    required: ['id', 'src', 'title'],
    optional: ['poster'],
    numeric: [],
    paired: false,
    placement: 'block',
    content: 'none',
  },
  'audio-embed': {
    required: ['id', 'src', 'title'],
    optional: [],
    numeric: [],
    paired: false,
    placement: 'block',
    content: 'none',
  },
  'canvas-render': {
    required: ['id', 'renderer'],
    optional: ['data-src', 'width', 'height'],
    numeric: ['width', 'height'],
    paired: false,
    placement: 'block',
    content: 'none',
  },
  'svg-embed': {
    required: ['id', 'src', 'title'],
    optional: [],
    numeric: [],
    paired: false,
    placement: 'block',
    content: 'none',
  },
  'html-embed': {
    required: ['id', 'src', 'title'],
    optional: ['height'],
    numeric: ['height'],
    paired: true,
    placement: 'block',
    content: 'fallback-text',
  },
  'web-embed': {
    required: ['id', 'src', 'title'],
    optional: ['height'],
    numeric: ['height'],
    paired: true,
    placement: 'block',
    content: 'fallback-text',
  },
  'choice-question': {
    required: ['id', 'data-src'],
    optional: [],
    numeric: [],
    paired: false,
    placement: 'block',
    content: 'none',
  },
  'fill-blank-question': {
    required: ['id', 'data-src'],
    optional: [],
    numeric: [],
    paired: false,
    placement: 'block',
    content: 'none',
  },
  'text-mark': {
    required: [],
    optional: ['id', 'tone', 'swatch', 'color', 'color-night', 'effect'],
    numeric: [],
    paired: true,
    placement: 'inline',
    content: 'phrasing',
  },
  'aside-note': {
    required: ['id', 'kind'],
    optional: ['title', 'swatch', 'tone'],
    numeric: [],
    paired: true,
    placement: 'block',
    content: 'flow',
  },
  'compare-block': {
    required: ['id'],
    optional: ['title'],
    numeric: [],
    paired: true,
    placement: 'block',
    content: 'slots',
  },
  'compare-side': {
    required: ['role'],
    optional: ['id', 'title'],
    numeric: [],
    paired: true,
    placement: 'slot',
    content: 'flow',
  },
  'timeline-block': {
    required: ['id'],
    optional: ['title', 'tone', 'swatch'],
    numeric: [],
    paired: true,
    placement: 'block',
    content: 'flow',
  },
  'inset-card': {
    required: ['id', 'title'],
    optional: ['eyebrow', 'kicker', 'swatch', 'tone'],
    numeric: [],
    paired: true,
    placement: 'block',
    content: 'flow',
  },
} as const satisfies Record<
  string,
  {
    required: readonly string[]
    optional: readonly string[]
    numeric: readonly string[]
    paired: boolean
    placement: ComponentPlacement
    content: ComponentContent
  }
>

export type ComponentName = keyof typeof COMPONENT_SCHEMAS
export type ComponentSchema = (typeof COMPONENT_SCHEMAS)[ComponentName]
export const REGISTERED_COMPONENT_NAMES = Object.freeze(
  Object.keys(COMPONENT_SCHEMAS) as ComponentName[],
)

export function isRegisteredComponentName(name: string): name is ComponentName {
  return Object.hasOwn(COMPONENT_SCHEMAS, name)
}

export function getComponentSchema(name: string): ComponentSchema | undefined {
  return isRegisteredComponentName(name) ? COMPONENT_SCHEMAS[name] : undefined
}

export function isPairedRegisteredName(name: string): name is ComponentName {
  const schema = getComponentSchema(name)
  return schema?.paired === true
}

export type ParsedComponent = {
  name: ComponentName
  id: string
  attributes: Readonly<Record<string, string | number>>
  attributeOffsets: Readonly<
    Record<string, { readonly start: number; readonly end: number }>
  >
  fallbackText: string
  fallbackSource: string
  fallbackOffset: number
}

export type ComponentParseResult =
  | { kind: 'component'; component: ParsedComponent }
  | { kind: 'unknown-tag'; tagName: string }
  | { kind: 'raw-html' }
  | { kind: 'invalid'; reason: 'syntax' | 'attribute'; message: string }

export function parseComponentSyntax(
  raw: string,
  _sourceRange: SourceRange,
): ComponentParseResult {
  const match = raw.match(
    /^<([a-z][a-z\d-]*)\b([\s\S]*?)(?:\s*\/\s*>|>([\s\S]*)<\/\1\s*>)$/,
  )
  if (!match) {
    const tag = raw.match(/^<([a-z][a-z\d-]*)\b/i)?.[1]
    return tag?.includes('-')
      ? { kind: 'invalid', reason: 'syntax', message: '自定义标签没有完整闭合。' }
      : { kind: 'raw-html' }
  }
  const [, rawName, rawAttributes = '', fallback = ''] = match
  const name = rawName as ComponentName
  if (!REGISTERED_COMPONENT_NAMES.includes(name)) {
    return rawName.includes('-')
      ? { kind: 'unknown-tag', tagName: rawName }
      : { kind: 'raw-html' }
  }
  const schema = COMPONENT_SCHEMAS[name]
  const isSelfClosing = /\/\s*>$/.test(raw)
  if (schema.paired === isSelfClosing) {
    return {
      kind: 'invalid',
      reason: 'syntax',
      message: schema.paired
        ? `${name} 必须使用成对闭合标签。`
        : `${name} 必须使用自闭合标签。`,
    }
  }

  const attributes: Record<string, string | number> = {}
  const attributeOffsets: Record<string, { start: number; end: number }> = {}
  const attributePattern = /([a-z][a-z\d-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  let cursor = 0
  for (const attribute of rawAttributes.matchAll(attributePattern)) {
    if (attribute.index === undefined) continue
    if (rawAttributes.slice(cursor, attribute.index).trim()) {
      return { kind: 'invalid', reason: 'attribute', message: '属性必须使用带引号的静态值。' }
    }
    const key = attribute[1]
    const value = attribute[2] ?? attribute[3] ?? ''
    if (!key || key in attributes) {
      return { kind: 'invalid', reason: 'attribute', message: '属性名缺失或重复。' }
    }
    if (
      !schema.required.includes(key as never) &&
      !schema.optional.includes(key as never)
    ) {
      return { kind: 'invalid', reason: 'attribute', message: `${name} 不允许属性 ${key}。` }
    }
    if (key.startsWith('on') || /[{}]/.test(value)) {
      return { kind: 'invalid', reason: 'attribute', message: '属性不允许事件或表达式。' }
    }
    if (schema.numeric.includes(key as never)) {
      const numberValue = Number(value)
      if (!Number.isSafeInteger(numberValue) || numberValue <= 0) {
        return { kind: 'invalid', reason: 'attribute', message: `${key} 必须是正整数。` }
      }
      attributes[key] = numberValue
    } else {
      attributes[key] = value
    }
    const valueOffset =
      match[0].indexOf(rawAttributes) +
      attribute.index +
      attribute[0].indexOf(value, attribute[0].indexOf('=') + 1)
    attributeOffsets[key] = {
      start: valueOffset,
      end: valueOffset + value.length,
    }
    cursor = attribute.index + attribute[0].length
  }
  if (rawAttributes.slice(cursor).trim()) {
    return { kind: 'invalid', reason: 'attribute', message: '属性语法无效。' }
  }
  for (const key of schema.required) {
    if (!(key in attributes) || attributes[key] === '') {
      return { kind: 'invalid', reason: 'attribute', message: `${name} 缺少必填属性 ${key}。` }
    }
  }
  const requiresId = (schema.required as readonly string[]).includes('id')
  const id = attributes.id
  if (requiresId || id !== undefined) {
    if (typeof id !== 'string' || !/^[a-z][a-z\d-]*$/.test(id)) {
      return { kind: 'invalid', reason: 'attribute', message: '组件 id 必须是小写 kebab-case。' }
    }
  }
  return {
    kind: 'component',
    component: {
      name,
      id: typeof id === 'string' ? id : '',
      attributes,
      attributeOffsets,
      fallbackText: fallback.trim().normalize('NFC'),
      fallbackSource: fallback.trim(),
      fallbackOffset:
        fallback.length > 0
          ? raw.indexOf(fallback) + fallback.search(/\S|$/)
          : 0,
    },
  }
}
