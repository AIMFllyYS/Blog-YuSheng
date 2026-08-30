import 'server-only'

export type HtmlEmbedProtocolValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string }

const HTML_EMBED_PROTOCOL_CHECKS = Object.freeze([
  {
    pattern:
      /URLSearchParams\s*\(\s*location\.hash\.slice\(\s*1\s*\)\s*\)\.get\(\s*["']nonce["']\s*\)/u,
    reason: '没有从 URL hash 读取 nonce。',
  },
  {
    pattern:
      /(?:window\.)?parent\.postMessage\s*\(\s*\{\s*nonce\s*,\s*message\s*:\s*\{\s*type\s*:\s*["']ready["']\s*\}\s*\}\s*,\s*["']\*["']\s*\)/u,
    reason: '没有发送带 nonce 的 ready 握手。',
  },
  {
    pattern:
      /(?:window\.)?parent\.postMessage\s*\(\s*\{[\s\S]{0,256}?\btype\s*:\s*["']resize["']/u,
    reason: '没有向宿主回传 resize 高度。',
  },
] as const)

/**
 * Checks the small protocol shared by author-owned HTML embeds and the host
 * iframe renderer. This is intentionally a static build-time check: the
 * browser still authenticates the runtime message with the per-iframe nonce.
 */
export function validateHtmlEmbedProtocol(
  source: string,
): HtmlEmbedProtocolValidation {
  for (const check of HTML_EMBED_PROTOCOL_CHECKS) {
    if (!check.pattern.test(source)) return { ok: false, reason: check.reason }
  }
  return { ok: true }
}
