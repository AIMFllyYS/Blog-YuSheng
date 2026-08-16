'use client'

import {
  createMermaidSvgBlobHandle,
  MERMAID_SECURITY_POLICY,
  sanitizeGeneratedMermaidSvg,
  validateMermaidWorkerOutput,
  validateMermaidSource,
  type DisposableBlobUrl,
} from '../../security/renderer-security'

const SANDBOX_URL = '/embeds/_runtime/mermaid/renderer.html'
const MESSAGE_RENDER = 'blog-yusheng:mermaid-render'
const MESSAGE_READY = 'blog-yusheng:mermaid-ready'
const MESSAGE_RESULT = 'blog-yusheng:mermaid-result'

export type MermaidTheme = Readonly<{
  background: string
  primaryColor: string
  primaryTextColor: string
  primaryBorderColor: string
  lineColor: string
  secondaryColor: string
  tertiaryColor: string
}>

export type MermaidSandboxSession = Readonly<{
  result: Promise<DisposableBlobUrl>
  cancel(): void
}>

export function startMermaidSandboxRender(
  source: string,
  theme: MermaidTheme,
): MermaidSandboxSession {
  const sourceFailure = validateMermaidSource(source)
  if (sourceFailure) {
    return Object.freeze({
      result: Promise.reject(new Error(sourceFailure)),
      cancel: () => undefined,
    })
  }

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.setAttribute('sandbox', 'allow-scripts')
  iframe.tabIndex = -1
  iframe.src = SANDBOX_URL
  Object.assign(iframe.style, {
    border: '0',
    height: '720px',
    left: '-10000px',
    opacity: '0',
    pointerEvents: 'none',
    position: 'fixed',
    top: '0',
    width: '960px',
  })

  const nonce = crypto.randomUUID()
  let cancelSession = (): void => undefined
  const result = new Promise<DisposableBlobUrl>((resolve, reject) => {
    let settled = false
    let requestSent = false
    const finish = (callback: () => void): void => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      window.removeEventListener('message', onMessage)
      iframe.remove()
      callback()
    }
    const fail = (message: string): void => {
      finish(() => reject(new Error(message)))
    }
    const onMessage = (event: MessageEvent<unknown>): void => {
      if (event.source !== iframe.contentWindow || event.origin !== 'null') return
      if (isReadyMessage(event.data)) {
        if (requestSent) return
        requestSent = true
        clearTimeout(timeoutId)
        timeoutId = window.setTimeout(
          () => fail('Mermaid 渲染超时，已终止当前图表。'),
          MERMAID_SECURITY_POLICY.renderTimeoutMs,
        )
        iframe.contentWindow?.postMessage(
          { type: MESSAGE_RENDER, nonce, source, theme },
          '*',
        )
        return
      }
      const response = parseResultMessage(event.data, nonce)
      if (!response) return
      if (!response.ok) {
        fail(response.error)
        return
      }
      try {
        const outputFailure = validateMermaidWorkerOutput(response.svg)
        if (outputFailure) throw new Error(outputFailure)
        const asset = sanitizeGeneratedMermaidSvg(response.svg)
        const handle = createMermaidSvgBlobHandle(asset)
        finish(() => resolve(handle))
      } catch (error) {
        fail(error instanceof Error ? error.message : 'Mermaid 输出清洗失败。')
      }
    }
    let timeoutId = window.setTimeout(
      () => fail('Mermaid 运行时加载超时，已终止当前图表。'),
      MERMAID_SECURITY_POLICY.loadTimeoutMs,
    )
    cancelSession = () => fail('Mermaid 渲染已取消。')
    window.addEventListener('message', onMessage)
    document.body.append(iframe)
  })

  return Object.freeze({ result, cancel: () => cancelSession() })
}

function isReadyMessage(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.keys(value).length === 1 &&
    'type' in value &&
    value.type === MESSAGE_READY
  )
}

type MermaidResultMessage =
  | { readonly ok: true; readonly svg: string }
  | { readonly ok: false; readonly error: string }

function parseResultMessage(
  value: unknown,
  nonce: string,
): MermaidResultMessage | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  if (record.type !== MESSAGE_RESULT || record.nonce !== nonce) return undefined
  if (
    record.ok === true &&
    typeof record.svg === 'string' &&
    Object.keys(record).length === 4
  ) {
    return { ok: true, svg: record.svg }
  }
  if (
    record.ok === false &&
    typeof record.error === 'string' &&
    record.error.length <= 1_000 &&
    Object.keys(record).length === 4
  ) {
    return { ok: false, error: record.error }
  }
  return undefined
}
