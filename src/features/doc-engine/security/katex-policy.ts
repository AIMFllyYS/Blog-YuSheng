export const KATEX_SECURITY_POLICY = Object.freeze({
  trust: false,
  strict: 'error',
  maxExpand: 1_000,
  maxNestingDepth: 64,
  maxSize: 20,
  maxSourceLength: 2_000,
  allowUserMacros: false,
  clientLoadTimeoutMs: 2_000,
} as const)

const USER_MACRO_PATTERN =
  /\\(?:def|gdef|edef|xdef|let|futurelet|newcommand|renewcommand|providecommand)\b/i
const KATEX_TRUST_COMMAND_PATTERN =
  /(?:^|[^\\])(?:\\\\)*\\(?:href|url|includegraphics|htmlClass|htmlId|htmlStyle|htmlData)\b/iu

export function validateKatexSource(source: string): string | undefined {
  if (source.length > KATEX_SECURITY_POLICY.maxSourceLength) {
    return `单条公式不得超过 ${KATEX_SECURITY_POLICY.maxSourceLength} 字符。`
  }
  if (!KATEX_SECURITY_POLICY.allowUserMacros && USER_MACRO_PATTERN.test(source)) {
    return '当前安全策略不允许用户定义 KaTeX 宏。'
  }
  if (!KATEX_SECURITY_POLICY.trust && KATEX_TRUST_COMMAND_PATTERN.test(source)) {
    return '当前安全策略不允许 KaTeX 链接、外部资源或 HTML 命令。'
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
