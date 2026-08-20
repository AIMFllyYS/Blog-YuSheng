import { DISCUSSION_LIMITS } from './render-limits'

export const MERMAID_SECURITY_POLICY = Object.freeze({
  securityLevel: 'strict',
  maxTextSize: DISCUSSION_LIMITS.maxMermaidSourceLength,
  maxOutputNodes: 2_000,
  maxOutputBytes: 500_000,
  maxAttributeLength: 32_000,
  maxTextLength: 32_000,
  loadTimeoutMs: 10_000,
  renderTimeoutMs: 2_000,
  allowUserClick: false,
  allowExternalLinks: false,
  htmlLabels: false,
  sanitizeGeneratedSvg: true,
  delivery: 'blob-image',
} as const)

const UNSAFE_MERMAID_PATTERN =
  /(?:^|\n)\s*(?:click\s+|%%\{|.*\bhref\b)|(?:javascript|data|vbscript):|https?:\/\/|url\s*\(|\/\//i

export function validateMermaidSource(source: string): string | undefined {
  if (source.length > MERMAID_SECURITY_POLICY.maxTextSize) {
    return `单条 Mermaid 源码不得超过 ${MERMAID_SECURITY_POLICY.maxTextSize} 字符。`
  }
  if (UNSAFE_MERMAID_PATTERN.test(source)) {
    return '当前 Mermaid 安全策略禁止配置覆盖、点击脚本和任意链接。'
  }
  return undefined
}
