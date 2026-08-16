import 'server-only'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const MAX_SVG_SOURCE_LENGTH = 512_000
const MAX_SVG_ELEMENTS = 2_000
const MAX_SVG_DEPTH = 64
const MAX_PATH_DATA_LENGTH = 20_000
const MAX_PATH_COMMANDS = 2_000

const ALLOWED_ELEMENTS = new Set([
  'svg',
  'title',
  'desc',
  'defs',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
])

const ALLOWED_ATTRIBUTES = new Set([
  'xmlns',
  'id',
  'viewBox',
  'width',
  'height',
  'x',
  'y',
  'x1',
  'x2',
  'y1',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'd',
  'points',
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'stroke-dashoffset',
  'opacity',
  'offset',
  'stop-color',
  'stop-opacity',
  'gradientUnits',
  'gradientTransform',
  'spreadMethod',
  'clip-path',
  'clip-rule',
  'transform',
  'font-family',
  'font-size',
  'font-weight',
  'text-anchor',
  'dominant-baseline',
  'preserveAspectRatio',
  'role',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'focusable',
])

const NUMERIC_ATTRIBUTES = new Set([
  'width',
  'height',
  'x',
  'y',
  'x1',
  'x2',
  'y1',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'stroke-width',
  'stroke-dashoffset',
  'font-size',
])

const OPACITY_ATTRIBUTES = new Set([
  'opacity',
  'fill-opacity',
  'stroke-opacity',
  'stop-opacity',
])

type SafeResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: string }

export type SanitizedSvgResult = SafeResult<string>

type ParsedTag = {
  readonly name: string
  readonly attributes: readonly (readonly [string, string])[]
  readonly selfClosing: boolean
}

export function sanitizeSvgSource(source: string): SanitizedSvgResult {
  if (source.length === 0 || source.length > MAX_SVG_SOURCE_LENGTH) {
    return failure('SVG 文件为空或超过 512,000 字符上限。')
  }
  if (/\u0000|\r(?!\n)/.test(source)) {
    return failure('SVG 包含不允许的控制字符或换行形式。')
  }

  const output: string[] = []
  const stack: string[] = []
  const ids = new Set<string>()
  const references: string[] = []
  let cursor = 0
  let elements = 0
  let rootClosed = false

  while (cursor < source.length) {
    const open = source.indexOf('<', cursor)
    if (open === -1) {
      const text = sanitizeText(source.slice(cursor), stack.at(-1))
      if (!text.ok) return text
      output.push(text.value)
      cursor = source.length
      break
    }

    const text = sanitizeText(source.slice(cursor, open), stack.at(-1))
    if (!text.ok) return text
    output.push(text.value)

    if (source.startsWith('<!--', open)) {
      const end = source.indexOf('-->', open + 4)
      if (end === -1) return failure('SVG 注释未闭合。')
      cursor = end + 3
      continue
    }
    if (source.startsWith('<?xml', open)) {
      if (elements > 0 || !/^<\?xml\s+version=(?:"1\.0"|'1\.0')(?:\s+encoding=(?:"UTF-8"|'UTF-8'))?\s*\?>/i.test(source.slice(open))) {
        return failure('SVG XML 声明不受支持。')
      }
      const end = source.indexOf('?>', open + 5)
      if (end === -1) return failure('SVG XML 声明未闭合。')
      cursor = end + 2
      continue
    }
    if (source.startsWith('<!', open) || source.startsWith('<?', open)) {
      return failure('SVG 禁止 DOCTYPE、CDATA、实体声明和处理指令。')
    }

    const end = findTagEnd(source, open + 1)
    if (end === -1) return failure('SVG 标签未闭合。')
    const rawTag = source.slice(open + 1, end)
    if (rawTag.startsWith('/')) {
      const closing = rawTag.slice(1).trim()
      if (!/^[A-Za-z][A-Za-z0-9-]*$/.test(closing)) {
        return failure('SVG 结束标签格式无效。')
      }
      if (stack.pop() !== closing) {
        return failure(`SVG 标签嵌套不匹配：${closing}。`)
      }
      output.push(`</${closing}>`)
      if (stack.length === 0) rootClosed = true
      cursor = end + 1
      continue
    }

    if (rootClosed) return failure('SVG 只能包含一个根元素。')
    const parsed = parseOpeningTag(rawTag)
    if (!parsed.ok) return parsed
    const tag = parsed.value
    if (!ALLOWED_ELEMENTS.has(tag.name)) {
      return failure(`SVG 元素不在安全白名单：${tag.name}。`)
    }
    if (elements === 0 && tag.name !== 'svg') {
      return failure('SVG 根元素必须是 svg。')
    }
    if (elements > 0 && tag.name === 'svg') {
      return failure('SVG 禁止嵌套 svg 根元素。')
    }
    elements += 1
    if (elements > MAX_SVG_ELEMENTS) {
      return failure(`SVG 元素数量超过 ${MAX_SVG_ELEMENTS} 个。`)
    }
    if (stack.length + 1 > MAX_SVG_DEPTH) {
      return failure(`SVG 嵌套深度超过 ${MAX_SVG_DEPTH} 层。`)
    }

    const attributes = sanitizeAttributes(tag, ids, references)
    if (!attributes.ok) return attributes
    if (tag.name === 'svg') {
      const namespace = tag.attributes.find(([name]) => name === 'xmlns')?.[1]
      if (namespace !== SVG_NAMESPACE) {
        return failure('SVG 根元素必须声明标准 SVG namespace。')
      }
    }
    output.push(
      `<${tag.name}${attributes.value.length > 0 ? ` ${attributes.value.join(' ')}` : ''}${tag.selfClosing ? ' />' : '>'}`,
    )
    if (!tag.selfClosing) stack.push(tag.name)
    else if (elements === 1) rootClosed = true
    cursor = end + 1
  }

  if (elements === 0 || stack.length > 0 || !rootClosed) {
    return failure('SVG 文档不完整或存在未闭合标签。')
  }
  const missingReference = references.find((reference) => !ids.has(reference))
  if (missingReference) {
    return failure(`SVG 本地片段引用不存在：#${missingReference}。`)
  }
  return { ok: true, value: `${output.join('').trim()}\n` }
}

function sanitizeAttributes(
  tag: ParsedTag,
  ids: Set<string>,
  references: string[],
): SafeResult<readonly string[]> {
  const output: string[] = []
  for (const [name, encodedValue] of tag.attributes) {
    if (
      name.includes(':') ||
      name.toLowerCase().startsWith('on') ||
      !ALLOWED_ATTRIBUTES.has(name) ||
      (name === 'xmlns' && tag.name !== 'svg')
    ) {
      return failure(`SVG 属性不在安全白名单：${name}。`)
    }
    const decoded = decodeXmlEntities(encodedValue)
    if (!decoded.ok) return decoded
    const value = decoded.value
    const validation = validateAttribute(name, value, ids, references)
    if (!validation.ok) return validation
    output.push(`${name}="${escapeAttribute(value)}"`)
  }
  return { ok: true, value: output }
}

function validateAttribute(
  name: string,
  value: string,
  ids: Set<string>,
  references: string[],
): SanitizedSvgResult {
  if (value.length > 20_000 || /[\u0000-\u001f\u007f]/.test(value)) {
    return failure(`SVG 属性 ${name} 超过限制或包含控制字符。`)
  }
  if (name === 'xmlns') {
    return value === SVG_NAMESPACE ? success() : failure('SVG namespace 无效。')
  }
  if (name === 'id') {
    if (!/^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/.test(value) || ids.has(value)) {
      return failure(`SVG id 无效或重复：${value}。`)
    }
    ids.add(value)
    return success()
  }
  if (name === 'd') {
    const commands = value.match(/[AaCcHhLlMmQqSsTtVvZz]/g)?.length ?? 0
    return value.length <= MAX_PATH_DATA_LENGTH &&
      commands <= MAX_PATH_COMMANDS &&
      /^[AaCcHhLlMmQqSsTtVvZz0-9eE+.,\s-]+$/.test(value)
      ? success()
      : failure('SVG path 数据无效或超过复杂度上限。')
  }
  if (name === 'points') {
    return value.length <= MAX_PATH_DATA_LENGTH && /^[0-9eE+.,\s-]+$/.test(value)
      ? success()
      : failure('SVG points 数据无效或超过长度上限。')
  }
  if (name === 'viewBox') {
    return /^\s*[-+]?\d*\.?\d+(?:e[-+]?\d+)?(?:[ ,]+[-+]?\d*\.?\d+(?:e[-+]?\d+)?){3}\s*$/i.test(value)
      ? success()
      : failure('SVG viewBox 无效。')
  }
  if (NUMERIC_ATTRIBUTES.has(name)) {
    return /^[-+]?\d*\.?\d+(?:e[-+]?\d+)?(?:px|pt|pc|mm|cm|in|em|rem|%)?$/i.test(value)
      ? success()
      : failure(`SVG 数值属性 ${name} 无效。`)
  }
  if (OPACITY_ATTRIBUTES.has(name)) {
    const number = Number(value)
    return Number.isFinite(number) && number >= 0 && number <= 1
      ? success()
      : failure(`SVG 透明度属性 ${name} 无效。`)
  }
  if (name === 'offset') {
    return /^(?:100|\d{1,2})(?:\.\d+)?%$/.test(value) ||
      (Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1)
      ? success()
      : failure('SVG gradient offset 无效。')
  }
  if (['fill', 'stroke', 'stop-color'].includes(name)) {
    return safePaint(value, references)
      ? success()
      : failure(`SVG 颜色或引用属性 ${name} 无效。`)
  }
  if (name === 'clip-path') {
    return recordLocalReference(value, references)
      ? success()
      : failure('SVG clip-path 只能引用当前文件内的合法 ID。')
  }
  if (name === 'aria-labelledby' || name === 'aria-describedby') {
    const values = value.trim().split(/\s+/)
    if (values.length === 0 || values.some((item) => !/^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/.test(item))) {
      return failure(`SVG ${name} 引用无效。`)
    }
    references.push(...values)
    return success()
  }
  if (name === 'transform' || name === 'gradientTransform') {
    return /^(?:(?:matrix|translate|scale|rotate|skewX|skewY)\(\s*[-+0-9.eE,\s]+\)\s*)+$/.test(value) && value.length <= 1_000
      ? success()
      : failure(`SVG transform 属性 ${name} 无效。`)
  }
  if (name === 'stroke-dasharray') {
    return value === 'none' || /^[0-9eE+.,\s-]+$/.test(value)
      ? success()
      : failure('SVG stroke-dasharray 无效。')
  }
  if (name === 'role') return ['img', 'presentation'].includes(value) ? success() : failure('SVG role 无效。')
  if (name === 'focusable') return ['true', 'false'].includes(value) ? success() : failure('SVG focusable 无效。')
  if (name === 'fill-rule' || name === 'clip-rule') return ['nonzero', 'evenodd'].includes(value) ? success() : failure(`SVG ${name} 无效。`)
  if (name === 'stroke-linecap') return ['butt', 'round', 'square'].includes(value) ? success() : failure('SVG stroke-linecap 无效。')
  if (name === 'stroke-linejoin') return ['miter', 'round', 'bevel'].includes(value) ? success() : failure('SVG stroke-linejoin 无效。')
  if (name === 'text-anchor') return ['start', 'middle', 'end'].includes(value) ? success() : failure('SVG text-anchor 无效。')
  if (name === 'spreadMethod') return ['pad', 'reflect', 'repeat'].includes(value) ? success() : failure('SVG spreadMethod 无效。')
  if (name === 'gradientUnits') return ['objectBoundingBox', 'userSpaceOnUse'].includes(value) ? success() : failure('SVG gradientUnits 无效。')
  if (name === 'font-family') return /^[\p{L}\p{N}\s,'"-]{1,128}$/u.test(value) ? success() : failure('SVG font-family 无效。')
  if (name === 'font-weight') return /^(?:normal|bold|[1-9]00)$/.test(value) ? success() : failure('SVG font-weight 无效。')
  if (name === 'dominant-baseline') return /^[a-z-]+$/.test(value) ? success() : failure('SVG dominant-baseline 无效。')
  if (name === 'preserveAspectRatio') return /^[A-Za-z\s]+$/.test(value) ? success() : failure('SVG preserveAspectRatio 无效。')
  if (name === 'aria-label') return value.trim().length > 0 && value.length <= 256 ? success() : failure('SVG aria-label 无效。')
  return success()
}

function safePaint(value: string, references: string[]): boolean {
  if (/^url\(#/.test(value)) return recordLocalReference(value, references)
  return /^(?:none|currentColor|transparent|#[0-9a-f]{3,8}|[a-z]+|(?:rgb|rgba|hsl|hsla)\([0-9.%+,-\s]+\))$/i.test(value)
}

function recordLocalReference(value: string, references: string[]): boolean {
  const match = /^url\(#([A-Za-z_][A-Za-z0-9_.-]{0,127})\)$/.exec(value)
  if (!match) return false
  references.push(match[1])
  return true
}

function sanitizeText(
  value: string,
  parent: string | undefined,
): SanitizedSvgResult {
  const decoded = decodeXmlEntities(value)
  if (!decoded.ok) return decoded
  if (!['title', 'desc', 'text', 'tspan'].includes(parent ?? '') && decoded.value.trim().length > 0) {
    return failure('SVG 图形容器中出现了不允许的裸文本。')
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(decoded.value)) {
    return failure('SVG 文本包含控制字符。')
  }
  return { ok: true, value: escapeText(decoded.value) }
}

function parseOpeningTag(raw: string): SafeResult<ParsedTag> {
  const trimmed = raw.trim()
  const selfClosing = trimmed.endsWith('/')
  const body = selfClosing ? trimmed.slice(0, -1).trimEnd() : trimmed
  const nameMatch = /^[A-Za-z][A-Za-z0-9-]*/.exec(body)
  if (!nameMatch) return failure('SVG 开始标签格式无效。')
  const name = nameMatch[0]
  let cursor = name.length
  const attributes: [string, string][] = []
  const seen = new Set<string>()
  while (cursor < body.length) {
    const whitespace = /^\s+/.exec(body.slice(cursor))
    if (!whitespace) return failure(`SVG 标签 ${name} 的属性间缺少空白。`)
    cursor += whitespace[0].length
    if (cursor >= body.length) break
    const attributeMatch = /^[A-Za-z_][A-Za-z0-9_.:-]*/.exec(body.slice(cursor))
    if (!attributeMatch) return failure(`SVG 标签 ${name} 包含无效属性名。`)
    const attribute = attributeMatch[0]
    if (seen.has(attribute)) return failure(`SVG 属性重复：${attribute}。`)
    seen.add(attribute)
    cursor += attribute.length
    cursor += /^\s*/.exec(body.slice(cursor))?.[0].length ?? 0
    if (body[cursor] !== '=') return failure(`SVG 属性 ${attribute} 缺少等号。`)
    cursor += 1
    cursor += /^\s*/.exec(body.slice(cursor))?.[0].length ?? 0
    const quote = body[cursor]
    if (quote !== '"' && quote !== "'") return failure(`SVG 属性 ${attribute} 必须使用引号。`)
    const end = body.indexOf(quote, cursor + 1)
    if (end === -1) return failure(`SVG 属性 ${attribute} 未闭合。`)
    attributes.push([attribute, body.slice(cursor + 1, end)])
    cursor = end + 1
  }
  return { ok: true, value: { name, attributes, selfClosing } }
}

function findTagEnd(source: string, start: number): number {
  let quote: '"' | "'" | undefined
  for (let index = start; index < source.length; index += 1) {
    const character = source[index]
    if (quote) {
      if (character === quote) quote = undefined
    } else if (character === '"' || character === "'") {
      quote = character
    } else if (character === '>') {
      return index
    }
  }
  return -1
}

function decodeXmlEntities(value: string): SanitizedSvgResult {
  let invalid = false
  const unsupportedAmpersand = value
    .replace(/&(?:amp|apos|gt|lt|quot|#(?:x[0-9a-f]+|\d+));/gi, '')
    .includes('&')
  const decoded = value.replace(/&([^;]+);/g, (_, entity: string) => {
    const named: Record<string, string> = {
      amp: '&',
      apos: "'",
      gt: '>',
      lt: '<',
      quot: '"',
    }
    if (entity in named) return named[entity]
    const numeric = /^#(x[0-9a-f]+|\d+)$/i.exec(entity)
    if (!numeric) {
      invalid = true
      return ''
    }
    const codePoint = numeric[1].toLowerCase().startsWith('x')
      ? Number.parseInt(numeric[1].slice(1), 16)
      : Number.parseInt(numeric[1], 10)
    if (
      !Number.isSafeInteger(codePoint) ||
      codePoint <= 0 ||
      codePoint > 0x10ffff ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff)
    ) {
      invalid = true
      return ''
    }
    return String.fromCodePoint(codePoint)
  })
  if (invalid || unsupportedAmpersand) return failure('SVG 包含无效或未转义的 XML entity。')
  return { ok: true, value: decoded }
}

function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;')
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function success(): SanitizedSvgResult {
  return { ok: true, value: '' }
}

function failure(reason: string): { readonly ok: false; readonly reason: string } {
  return { ok: false, reason }
}
