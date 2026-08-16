import DOMPurify from 'dompurify'

import { DISCUSSION_LIMITS } from './render-limits'

export const KATEX_SECURITY_POLICY = Object.freeze({
  trust: false,
  strict: 'error',
  maxExpand: 1_000,
  maxNestingDepth: 64,
  maxSize: 20,
  maxSourceLength: 2_000,
  allowUserMacros: false,
} as const)

export const MERMAID_SECURITY_POLICY = Object.freeze({
  securityLevel: 'strict',
  maxTextSize: DISCUSSION_LIMITS.maxMermaidSourceLength,
  maxOutputNodes: 2_000,
  maxOutputBytes: 500_000,
  maxAttributeLength: 32_000,
  maxTextLength: 32_000,
  renderTimeoutMs: 2_000,
  allowUserClick: false,
  allowExternalLinks: false,
  htmlLabels: false,
  sanitizeGeneratedSvg: true,
  delivery: 'blob-image',
} as const)

export const CANVAS_SECURITY_POLICY = Object.freeze({
  maxWidth: 2_048,
  maxHeight: 2_048,
  maxPixels: 4_194_304,
  maxExecutionTimeMs: 2_000,
  maxInstancesPerDocument: DISCUSSION_LIMITS.maxSafeCanvasInstances,
} as const)

export const DISCUSSION_WRITE_RATE_POLICY = Object.freeze({
  windowMs: 60_000,
  maxWritesPerAccount: 10,
  maxWritesPerArticle: 50,
} as const)

const USER_MACRO_PATTERN =
  /\\(?:def|gdef|edef|xdef|let|futurelet|newcommand|renewcommand|providecommand)\b/i
const UNSAFE_MERMAID_PATTERN =
  /(?:^|\n)\s*(?:click\s+|%%\{|.*\bhref\b)|(?:javascript|data|vbscript):|https?:\/\//i

export function validateKatexSource(source: string): string | undefined {
  if (source.length > KATEX_SECURITY_POLICY.maxSourceLength) {
    return `单条公式不得超过 ${KATEX_SECURITY_POLICY.maxSourceLength} 字符。`
  }
  if (!KATEX_SECURITY_POLICY.allowUserMacros && USER_MACRO_PATTERN.test(source)) {
    return '当前安全策略不允许用户定义 KaTeX 宏。'
  }
  let nestingDepth = 0
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\\') {
      index += 1
      continue
    }
    if (source[index] === '{') nestingDepth += 1
    if (source[index] === '}') nestingDepth = Math.max(0, nestingDepth - 1)
    if (nestingDepth > KATEX_SECURITY_POLICY.maxNestingDepth) {
      return `KaTeX 嵌套不得超过 ${KATEX_SECURITY_POLICY.maxNestingDepth} 层。`
    }
  }
  return undefined
}

export function validateMermaidSource(source: string): string | undefined {
  if (source.length > MERMAID_SECURITY_POLICY.maxTextSize) {
    return `单条 Mermaid 源码不得超过 ${MERMAID_SECURITY_POLICY.maxTextSize} 字符。`
  }
  if (UNSAFE_MERMAID_PATTERN.test(source)) {
    return '当前 Mermaid 安全策略禁止配置覆盖、点击脚本和任意链接。'
  }
  return undefined
}

export function validateCanvasRequest(input: {
  readonly width: number
  readonly height: number
  readonly executionTimeMs?: number
}): string | undefined {
  if (
    !Number.isSafeInteger(input.width) ||
    !Number.isSafeInteger(input.height) ||
    input.width <= 0 ||
    input.height <= 0 ||
    input.width > CANVAS_SECURITY_POLICY.maxWidth ||
    input.height > CANVAS_SECURITY_POLICY.maxHeight ||
    input.width * input.height > CANVAS_SECURITY_POLICY.maxPixels
  ) {
    return 'Canvas 尺寸超过集中安全预算。'
  }
  if (
    input.executionTimeMs !== undefined &&
    (!Number.isFinite(input.executionTimeMs) ||
      input.executionTimeMs < 0 ||
      input.executionTimeMs > CANVAS_SECURITY_POLICY.maxExecutionTimeMs)
  ) {
    return 'Canvas 执行时间超过集中安全预算。'
  }
  return undefined
}

export function validateDiscussionOperationLimits(input: {
  readonly replyDepth?: number
  readonly pageSize?: number
  readonly exportEntries?: number
  readonly exportSourceBytes?: number
}): readonly string[] {
  const failures: string[] = []
  if (invalidBoundedInteger(input.replyDepth, DISCUSSION_LIMITS.maxReplyDepth)) {
    failures.push(`回复深度不得超过 ${DISCUSSION_LIMITS.maxReplyDepth} 层。`)
  }
  if (invalidBoundedInteger(input.pageSize, DISCUSSION_LIMITS.pageSize)) {
    failures.push(`单次读取不得超过 ${DISCUSSION_LIMITS.pageSize} 条。`)
  }
  if (
    invalidBoundedInteger(input.exportEntries, DISCUSSION_LIMITS.maxExportEntries)
  ) {
    failures.push(`单次导出讨论不得超过 ${DISCUSSION_LIMITS.maxExportEntries} 条。`)
  }
  if (
    invalidBoundedInteger(
      input.exportSourceBytes,
      DISCUSSION_LIMITS.maxExportSourceBytes,
    )
  ) {
    failures.push(`单次导出讨论源码不得超过 ${DISCUSSION_LIMITS.maxExportSourceBytes} bytes。`)
  }
  return failures
}

export function discussionWriteRateAllowed(input: {
  readonly accountWritesInWindow: number
  readonly articleWritesInWindow: number
}): boolean {
  return (
    Number.isSafeInteger(input.accountWritesInWindow) &&
    input.accountWritesInWindow >= 0 &&
    Number.isSafeInteger(input.articleWritesInWindow) &&
    input.articleWritesInWindow >= 0 &&
    input.accountWritesInWindow < DISCUSSION_WRITE_RATE_POLICY.maxWritesPerAccount &&
    input.articleWritesInWindow < DISCUSSION_WRITE_RATE_POLICY.maxWritesPerArticle
  )
}

function invalidBoundedInteger(value: number | undefined, maximum: number): boolean {
  return (
    value !== undefined &&
    (!Number.isSafeInteger(value) || value < 0 || value > maximum)
  )
}

export type MermaidWorkerPort = Pick<
  Worker,
  'addEventListener' | 'removeEventListener' | 'postMessage' | 'terminate'
>

/** Mermaid must run in a dedicated worker that this function owns and terminates. */
export function renderMermaidInWorker(
  worker: MermaidWorkerPort,
  request: unknown,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let settled = false
    const finish = (callback: () => void): void => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
      worker.terminate()
      callback()
    }
    const handleMessage = (event: MessageEvent<unknown>): void => {
      const response = parseWorkerResponse(event.data)
      if (!response) {
        finish(() => reject(new Error('Mermaid Worker 返回了无效消息。')))
        return
      }
      if (response.ok) {
        const budgetFailure = validateMermaidWorkerOutput(response.svg)
        if (budgetFailure) finish(() => reject(new Error(budgetFailure)))
        else finish(() => resolve(response.svg))
      }
      else finish(() => reject(new Error(response.error)))
    }
    const handleError = (): void => {
      finish(() => reject(new Error('Mermaid Worker 执行失败。')))
    }
    const timeoutId = setTimeout(
      () => finish(() => reject(new Error('Mermaid 渲染超时，Worker 已终止。'))),
      MERMAID_SECURITY_POLICY.renderTimeoutMs,
    )
    try {
      worker.addEventListener('message', handleMessage)
      worker.addEventListener('error', handleError)
      worker.postMessage(request)
    } catch {
      finish(() => reject(new Error('Mermaid Worker 初始化失败。')))
    }
  })
}

export type MermaidWorkerResponse =
  | { readonly ok: true; readonly svg: string }
  | { readonly ok: false; readonly error: string }

export function createMermaidWorkerSuccess(svg: string): MermaidWorkerResponse {
  const failure = validateMermaidWorkerOutput(svg)
  if (failure) throw new Error(failure)
  return Object.freeze({ ok: true, svg })
}

function parseWorkerResponse(value: unknown): MermaidWorkerResponse | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  if (
    record.ok === true &&
    typeof record.svg === 'string' &&
    Object.keys(record).length === 2
  ) {
    return { ok: true, svg: record.svg }
  }
  if (
    record.ok === false &&
    typeof record.error === 'string' &&
    record.error.length <= 1_000 &&
    Object.keys(record).length === 2
  ) {
    return { ok: false, error: record.error }
  }
  return undefined
}

/** Must be called inside the worker before postMessage and is repeated by the host. */
export function validateMermaidWorkerOutput(svg: string): string | undefined {
  if (svg.length > MERMAID_SECURITY_POLICY.maxOutputBytes) {
    return 'Mermaid SVG 输出字节超过集中安全预算。'
  }
  const outputBytes = new TextEncoder().encode(svg).byteLength
  if (outputBytes > MERMAID_SECURITY_POLICY.maxOutputBytes) {
    return 'Mermaid SVG 输出字节超过集中安全预算。'
  }
  for (const tag of svg.matchAll(/<[A-Za-z][^>]*>/g)) {
    if (tag[0].length > MERMAID_SECURITY_POLICY.maxAttributeLength) {
      return 'Mermaid SVG 单元素属性超过集中安全预算。'
    }
  }
  for (const text of svg.matchAll(/>([^<]+)</g)) {
    if ((text[1]?.length ?? 0) > MERMAID_SECURITY_POLICY.maxTextLength) {
      return 'Mermaid SVG 单文本节点超过集中安全预算。'
    }
  }
  return undefined
}

export type SanitizedMermaidImage = {
  readonly mimeType: 'image/svg+xml'
  readonly delivery: 'blob-image'
  readonly [MERMAID_IMAGE_BRAND]: true
}

const MERMAID_IMAGE_BRAND: unique symbol = Symbol('sanitized-mermaid-image')
const MERMAID_IMAGE_CONTENT = new WeakMap<SanitizedMermaidImage, string>()

export function sanitizeGeneratedMermaidSvg(svg: string): SanitizedMermaidImage {
  const budgetFailure = validateMermaidWorkerOutput(svg)
  if (budgetFailure) throw new Error(budgetFailure)
  if (
    typeof DOMParser === 'undefined' ||
    typeof XMLSerializer === 'undefined' ||
    DOMPurify.isSupported !== true ||
    typeof DOMPurify.sanitize !== 'function'
  ) {
    throw new Error('Mermaid SVG 必须在具备真实 DOMPurify 与 XML DOM 的浏览器中清洗。')
  }
  const sanitized = String(
    DOMPurify.sanitize(svg, {
      USE_PROFILES: { svg: true, svgFilters: true },
      ALLOWED_TAGS: [...SAFE_MERMAID_SVG_TAGS],
      ALLOWED_ATTR: [...SAFE_MERMAID_SVG_ATTRIBUTES],
      FORBID_TAGS: [
        'script',
        'style',
        'foreignObject',
        'iframe',
        'object',
        'embed',
        'image',
        'a',
      ],
      FORBID_ATTR: ['style', 'href', 'xlink:href'],
      ALLOW_ARIA_ATTR: true,
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
    }),
  )
  const document = new DOMParser().parseFromString(sanitized, 'image/svg+xml')
  const root = assertSafeMermaidSvgDocument(document)
  const serialized = new XMLSerializer().serializeToString(root)
  const serializedBudget = validateMermaidWorkerOutput(serialized)
  if (serializedBudget) throw new Error(serializedBudget)
  const asset: SanitizedMermaidImage = {
    mimeType: 'image/svg+xml',
    delivery: 'blob-image',
    [MERMAID_IMAGE_BRAND]: true,
  }
  const frozenAsset = Object.freeze(asset)
  MERMAID_IMAGE_CONTENT.set(frozenAsset, serialized)
  return frozenAsset
}

export type DisposableBlobUrl = {
  readonly url: string
  readonly disposed: boolean
  dispose(): void
}

export function createDisposableBlobUrl(blob: Blob): DisposableBlobUrl {
  const url = URL.createObjectURL(blob)
  let disposed = false
  return Object.freeze({
    url,
    get disposed() {
      return disposed
    },
    dispose() {
      if (disposed) return
      disposed = true
      URL.revokeObjectURL(url)
    },
  })
}

export function createMermaidSvgBlobHandle(
  asset: SanitizedMermaidImage,
): DisposableBlobUrl {
  const svg = MERMAID_IMAGE_CONTENT.get(asset)
  if (
    asset[MERMAID_IMAGE_BRAND] !== true ||
    asset.delivery !== 'blob-image' ||
    asset.mimeType !== 'image/svg+xml' ||
    svg === undefined
  ) {
    throw new Error('Mermaid 仅允许通过隔离的 SVG Blob 图片交付。')
  }
  return createDisposableBlobUrl(
    new Blob([svg], { type: `${asset.mimeType};charset=utf-8` }),
  )
}

function assertSafeMermaidSvgDocument(document: Document): SVGSVGElement {
  if (document.doctype || document.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Mermaid SVG 不是严格合法的 XML。')
  }
  const root = document.documentElement
  if (
    root.localName !== 'svg' ||
    root.namespaceURI !== SVG_NAMESPACE ||
    root.prefix !== null
  ) {
    throw new Error('Mermaid 输出必须只有一个 SVG 根节点。')
  }
  const rootElements = Array.from(document.childNodes).filter(
    (node) => node.nodeType === 1,
  )
  if (rootElements.length !== 1 || rootElements[0] !== root) {
    throw new Error('Mermaid 输出必须只有一个 SVG 根节点。')
  }
  for (const node of Array.from(document.childNodes)) {
    if (
      node !== root &&
      !(
        (node.nodeType === 3 && !node.textContent?.trim()) ||
        node.nodeType === 8
      )
    ) {
      throw new Error('Mermaid SVG 根节点外包含额外内容。')
    }
  }
  const elements = [root, ...Array.from(root.getElementsByTagName('*'))]
  if (elements.length > MERMAID_SECURITY_POLICY.maxOutputNodes) {
    throw new Error('Mermaid SVG 输出节点超过集中安全预算。')
  }
  const ids = new Set<string>()
  const references: string[] = []
  for (const element of elements) {
    if (
      element.namespaceURI !== SVG_NAMESPACE ||
      element.prefix !== null ||
      !SAFE_MERMAID_SVG_TAGS.includes(element.localName)
    ) {
      throw new Error(`Mermaid SVG 包含未允许元素或 namespace：${element.tagName}`)
    }
    for (const attribute of Array.from(element.attributes)) {
      const isXmlns =
        attribute.name === 'xmlns' && attribute.namespaceURI === XMLNS_NAMESPACE
      if (
        (!isXmlns && (attribute.namespaceURI !== null || attribute.prefix !== null)) ||
        !SAFE_MERMAID_SVG_ATTRIBUTES.includes(attribute.localName)
      ) {
        throw new Error(`Mermaid SVG 包含未允许属性：${attribute.name}`)
      }
      if (isXmlns && attribute.value !== SVG_NAMESPACE) {
        throw new Error('Mermaid SVG namespace 无效。')
      }
      if (unsafeSvgAttributeValue(attribute.value)) {
        throw new Error(`Mermaid SVG 属性 ${attribute.name} 包含外部资源或 CSS 注入。`)
      }
      for (const reference of attribute.value.matchAll(
        /url\(\s*["']?#([^)"'\s]+)["']?\s*\)/g,
      )) {
        references.push(reference[1]!)
      }
      if (attribute.localName === 'id') {
        if (!/^[A-Za-z_][\w:.-]*$/.test(attribute.value) || ids.has(attribute.value)) {
          throw new Error('Mermaid SVG id 未隔离或发生重复。')
        }
        ids.add(attribute.value)
      }
    }
  }
  if (references.some((reference) => !ids.has(reference))) {
    throw new Error('Mermaid SVG 包含跨图或不存在的 fragment 引用。')
  }
  return root as unknown as SVGSVGElement
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const XMLNS_NAMESPACE = 'http://www.w3.org/2000/xmlns/'

const SAFE_MERMAID_SVG_TAGS = Object.freeze([
  'svg',
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
  'defs',
  'marker',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
  'mask',
  'filter',
  'feGaussianBlur',
  'feOffset',
  'feBlend',
  'title',
  'desc',
])

const SAFE_MERMAID_SVG_ATTRIBUTES = Object.freeze([
  'xmlns',
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
  'points',
  'd',
  'transform',
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'opacity',
  'id',
  'text-anchor',
  'dominant-baseline',
  'font-family',
  'font-size',
  'font-weight',
  'marker-start',
  'marker-mid',
  'marker-end',
  'refX',
  'refY',
  'markerWidth',
  'markerHeight',
  'orient',
  'offset',
  'stop-color',
  'stop-opacity',
  'clip-path',
  'mask',
  'filter',
  'preserveAspectRatio',
])

function unsafeSvgAttributeValue(value: string): boolean {
  if (/[\u0000-\u001f\u007f]|@import|expression\s*\(|(?:https?|data|javascript|vbscript):|\/\//i.test(value)) {
    return true
  }
  for (const match of value.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/gi)) {
    if (!/^#[A-Za-z][\w:.-]*$/.test(match[1] ?? '')) return true
  }
  return false
}
