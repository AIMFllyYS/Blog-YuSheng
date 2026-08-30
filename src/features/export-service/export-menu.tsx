'use client'

import { useRef, useState } from 'react'
import { useFallingToast } from '@/components/ui/falling-toast'
import { sortAnnotationViews } from '@/features/annotations/sort-annotation-threads'
import { useDiscussionRuntime } from '@/features/discussions/runtime'
import type { DiscussionExportScope, ExportFormat } from './export-document'
import type { ReviewAppendixModel } from './markdown/review-appendix'
import { useExportRuntime } from './export-runtime'
import { loadArticleExportSource } from './export-source'

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
  { id: 'body-only', label: '纯正文' },
  { id: 'body-with-annotations', label: '正文+注释' },
  { id: 'body-with-comments', label: '正文+评论' },
  { id: 'body-with-all-discussions', label: '全部' },
] as const satisfies readonly {
  readonly id: DiscussionExportScope
  readonly label: string
}[]

function isScopeAvailable(
  scope: DiscussionExportScope,
  format: ExportFormat,
): boolean {
  if (scope === 'body-only') return true
  if (scope === 'body-with-annotations') return format === 'markdown'
  return false
}

const chipClassName =
  'min-h-9 rounded-full border border-[var(--line)] bg-transparent px-3 py-1.5 text-xs text-[var(--ink-muted)] transition-[border-color,color,background-color] duration-[var(--dur-fast)] ease-out hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--highlight)] aria-pressed:text-[var(--accent)] aria-disabled:text-[var(--ink-faint)] aria-disabled:hover:border-[var(--line)] aria-disabled:hover:text-[var(--ink-faint)]'

export function ExportMenu() {
  const runtime = useExportRuntime()
  const discussion = useDiscussionRuntime()
  const { notify } = useFallingToast()
  const [format, setFormat] = useState<ExportFormat>('markdown')
  const [scope, setScope] = useState<DiscussionExportScope>('body-only')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const cancelledRef = useRef(false)

  const selectedFormat = FORMATS.find((item) => item.id === format)
  const selectedScopeAvailable = isScopeAvailable(scope, format)
  const available = Boolean(selectedFormat?.available && selectedScopeAvailable)
  const unavailableHint = !selectedFormat?.available
    ? `${selectedFormat?.label ?? ''} 导出随后续版本开放`.trim()
    : !selectedScopeAvailable
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
      const [{ assembleExport }, { downloadBlob }, prepare] = await Promise.all([
        import('./assemble-export'),
        import('@/lib/download'),
        scope === 'body-with-annotations'
          ? import('./markdown/prepare-review-appendix')
          : Promise.resolve(undefined),
      ])
      if (cancelledRef.current) return
      const source = await loadArticleExportSource(runtime.articleSlug)
      if (cancelledRef.current) return
      setProgress(48)
      const snapshotAt = new Date().toISOString()
      let appendix: ReviewAppendixModel | undefined
      if (prepare) {
        const listed = await discussion.repo.listAnnotationThreads(runtime.articleSlug)
        const prepared = await prepare.prepareReviewAppendix({
          articleSlug: source.articleSlug,
          documentFingerprint: source.documentFingerprint,
          snapshotAt,
          threads: sortAnnotationViews(listed, discussion.selectionIndex),
        })
        if (cancelledRef.current) return
        if (!prepared.ok) {
          setStatus(prepared.message)
          return
        }
        appendix = prepared.model
      }
      setProgress(72)
      const result = assembleExport({
        appendix,
        document: {
          articleSlug: source.articleSlug,
          originalSource: source.originalSource,
        },
        format,
        generatedAt: snapshotAt,
        plainText: source.plainText,
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
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '导出失败')
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
      <div className="mt-2 mb-3.5 flex flex-wrap gap-2" data-export-formats>
        {FORMATS.map((item) => (
          <button
            aria-disabled={!item.available}
            aria-pressed={format === item.id}
            className={chipClassName}
            key={item.id}
            onClick={() => {
              setFormat(item.id)
              setStatus(item.available ? '' : `${item.label} 导出随后续版本开放`)
            }}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <h3 className="text-xs font-semibold tracking-[0.18em] text-[var(--ink-muted)]">
        内容范围
      </h3>
      <div className="mt-2 mb-3 flex flex-wrap gap-2" data-export-scopes>
        {SCOPES.map((item) => (
          <button
            aria-disabled={!isScopeAvailable(item.id, format)}
            aria-pressed={scope === item.id}
            className={chipClassName}
            key={item.id}
            onClick={() => {
              const open = isScopeAvailable(item.id, format)
              setScope(item.id)
              setStatus(open ? '' : '该内容范围随后续版本开放')
            }}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex min-h-11 items-center justify-between gap-3 text-[13px] text-[var(--ink-muted)]">
        <span>
          问答题包含答案与解析
          <span className="mt-0.5 block text-[11px] leading-4 text-[var(--ink-faint)]">
            未开放
          </span>
        </span>
        <button
          aria-disabled="true"
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
        注释快照按点击时固定。评论快照随后续版本开放。点击后直接生成文件下载，不会调用打印对话框。
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
