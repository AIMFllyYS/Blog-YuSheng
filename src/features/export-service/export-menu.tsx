'use client'

import { useRef, useState } from 'react'
import { useFallingToast } from '@/components/ui/falling-toast'
import type { DiscussionExportScope, ExportFormat } from './export-document'
import { useExportRuntime } from './export-runtime'

const FORMATS = [
  { id: 'markdown', label: 'Markdown', available: true },
  { id: 'text', label: 'TXT', available: true },
  { id: 'docx', label: 'DOCX', available: false },
  { id: 'pdf', label: 'PDF', available: false },
] as const satisfies readonly {
  readonly id: ExportFormat
  readonly label: string
  readonly available: boolean
}[]

const SCOPES = [
  { id: 'body-only', label: '纯正文', available: true },
  { id: 'body-with-annotations', label: '正文+注释', available: false },
  { id: 'body-with-comments', label: '正文+评论', available: false },
  { id: 'body-with-all-discussions', label: '全部', available: false },
] as const satisfies readonly {
  readonly id: DiscussionExportScope
  readonly label: string
  readonly available: boolean
}[]

const chipClassName =
  'min-h-9 rounded-full border border-[var(--line)] bg-transparent px-3 py-1.5 text-left text-xs text-[var(--ink-muted)] transition-[border-color,color,background-color] duration-[var(--dur-fast)] ease-out hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--highlight)] aria-pressed:text-[var(--accent)]'

export function ExportMenu() {
  const runtime = useExportRuntime()
  const { notify } = useFallingToast()
  const [format, setFormat] = useState<ExportFormat>('markdown')
  const [scope, setScope] = useState<DiscussionExportScope>('body-only')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const cancelledRef = useRef(false)

  const selectedFormat = FORMATS.find((item) => item.id === format)
  const selectedScope = SCOPES.find((item) => item.id === scope)
  const available = Boolean(selectedFormat?.available && selectedScope?.available)
  const unavailableHint = !selectedFormat?.available
    ? `${selectedFormat?.label ?? ''} 导出随后续版本开放`.trim()
    : !selectedScope?.available
      ? '该内容范围随后续版本开放'
      : ''

  const startExport = async () => {
    if (!runtime) {
      setStatus('导出上下文未就绪')
      return
    }
    cancelledRef.current = false
    setBusy(true)
    setProgress(24)
    setStatus(available ? '正在导出…' : unavailableHint)
    try {
      const [{ assembleExport }, { downloadBlob }] = await Promise.all([
        import('./assemble-export'),
        import('@/lib/download'),
      ])
      if (cancelledRef.current) return
      setProgress(72)
      const result = assembleExport({
        assetManifest: runtime.assetManifest,
        document: runtime.document,
        format,
        scope,
      })
      if (cancelledRef.current) return
      if (!result.ok) {
        setStatus(result.message)
        return
      }
      setProgress(100)
      downloadBlob(
        new Blob([toBlobPart(result.artifact.bytes)], {
          type: result.artifact.mimeType,
        }),
        result.artifact.filename,
      )
      notify(format === 'markdown' ? '已导出 Markdown' : '已导出 TXT')
      setStatus('')
    } finally {
      setBusy(false)
      setProgress(0)
    }
  }

  return (
    <div data-export-menu>
      <h3 className="text-xs font-semibold tracking-[0.18em] text-[var(--ink-muted)]">
        格式
      </h3>
      <div className="mt-2 mb-3.5 flex flex-wrap gap-2">
        {FORMATS.map((item) => (
          <button
            aria-pressed={format === item.id}
            className={chipClassName}
            key={item.id}
            onClick={() => {
              setFormat(item.id)
              setStatus(item.available ? '' : `${item.label} 导出随后续版本开放`)
            }}
            type="button"
          >
            <span>{item.label}</span>
            {!item.available ? (
              <span className="mt-0.5 block text-[10px] leading-4 text-[var(--ink-faint)]">
                随后续版本开放
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <h3 className="text-xs font-semibold tracking-[0.18em] text-[var(--ink-muted)]">
        内容范围
      </h3>
      <div className="mt-2 mb-3 flex flex-wrap gap-2">
        {SCOPES.map((item) => (
          <button
            aria-pressed={scope === item.id}
            className={chipClassName}
            key={item.id}
            onClick={() => {
              setScope(item.id)
              setStatus(item.available ? '' : '该内容范围随后续版本开放')
            }}
            type="button"
          >
            <span>{item.label}</span>
            {!item.available ? (
              <span className="mt-0.5 block text-[10px] leading-4 text-[var(--ink-faint)]">
                随后续版本开放
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mb-3 flex min-h-11 items-center justify-between gap-3 text-[13px] text-[var(--ink-muted)]">
        <span>问答题包含答案与解析</span>
        <span className="text-[11px] text-[var(--ink-faint)]">未开放</span>
        <button
          aria-label="包含答案与解析"
          aria-pressed="false"
          className="relative h-[22px] w-10 shrink-0 rounded-full border border-[var(--line)] bg-[var(--bg)]"
          onClick={() => setStatus('问答题答案随后续版本开放')}
          type="button"
        >
          <span
            aria-hidden="true"
            className="absolute top-0.5 left-0.5 size-4 rounded-full bg-[var(--ink-faint)]"
          />
        </button>
      </div>

      <p className="m-0 text-[11px] leading-[1.7] text-[var(--ink-faint)]">
        讨论快照随后续版本开放。点击后直接生成文件下载，不会调用打印对话框。
      </p>
      {status ? (
        <p className="mt-2 text-[11px] leading-[1.7] text-[var(--ink-muted)]" role="status">
          {status}
        </p>
      ) : null}

      {busy ? (
        <button
          className="mt-3 w-full rounded-[3px] border border-[var(--line)] py-2 text-[13px] tracking-[0.12em] text-[var(--ink-muted)] transition-colors duration-[var(--dur-fast)] ease-out hover:border-[var(--accent)] hover:text-[var(--accent)]"
          onClick={() => {
            cancelledRef.current = true
            setBusy(false)
            setProgress(0)
            setStatus('已取消导出')
          }}
          type="button"
        >
          取消
        </button>
      ) : (
        <button
          className="mt-3 w-full rounded-[3px] border border-[var(--accent)] py-2 text-[13px] tracking-[0.12em] text-[var(--accent)] transition-colors duration-[var(--dur-fast)] ease-out hover:bg-[var(--accent)] hover:text-[var(--bg-elevated)]"
          onClick={() => void startExport()}
          type="button"
        >
          开始导出
        </button>
      )}

      {busy ? (
        <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-[var(--line)]">
          <i
            className="block h-full bg-[var(--accent)] transition-[width] duration-[120ms]"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
    </div>
  )
}

function toBlobPart(bytes: Uint8Array): BlobPart {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy
}
