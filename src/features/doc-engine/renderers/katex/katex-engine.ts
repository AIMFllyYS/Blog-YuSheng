import katex from 'katex'

import {
  KATEX_SECURITY_POLICY,
  validateKatexSource,
} from '../../security/renderer-security'

export type KatexRenderResult =
  | { readonly ok: true; readonly html: string }
  | { readonly ok: false; readonly message: string }

export function renderKatexToHtml(
  source: string,
  displayMode: boolean,
): KatexRenderResult {
  const policyFailure = validateKatexSource(source)
  if (policyFailure) return Object.freeze({ ok: false, message: policyFailure })
  try {
    const html = katex.renderToString(source, {
      displayMode,
      throwOnError: true,
      trust: KATEX_SECURITY_POLICY.trust,
      strict: KATEX_SECURITY_POLICY.strict,
      maxExpand: KATEX_SECURITY_POLICY.maxExpand,
      maxSize: KATEX_SECURITY_POLICY.maxSize,
      macros: Object.create(null) as Record<string, string>,
      globalGroup: false,
      output: 'htmlAndMathml',
    })
    if (html.includes('katex-error')) {
      return Object.freeze({
        ok: false,
        message: 'KaTeX 安全策略拒绝了此公式中的命令。',
      })
    }
    return Object.freeze({ ok: true, html })
  } catch (error) {
    return Object.freeze({
      ok: false,
      message: error instanceof Error ? error.message : 'KaTeX 无法解析此公式。',
    })
  }
}
