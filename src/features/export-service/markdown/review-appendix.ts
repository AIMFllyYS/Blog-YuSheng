export const REVIEW_APPENDIX_SCHEMA_VERSION = 1 as const
export const REVIEW_APPENDIX_START = '<!-- blog-review-appendix:v1 -->'
export const REVIEW_APPENDIX_END = '<!-- /blog-review-appendix:v1 -->'
export const REVIEW_LOCATOR_INFO = 'blog-review-locator'
export const REVIEW_ENTRY_INFO = 'blog-review-entry'

export type ReviewAnchorState = 'attached' | 'reattached' | 'orphaned'
export type ReviewAuthorBadge = '作者' | '访客'

export type ReviewLocator = {
  readonly kind: 'annotation'
  readonly threadId: string
  readonly anchorState: ReviewAnchorState
  readonly protocolVersion: 1
  readonly articleSlug: string
  readonly documentFingerprint: string
  readonly startBlockId: string
  readonly startOffset: number
  readonly endBlockId: string
  readonly endOffset: number
  readonly exact: string
  readonly prefix: string
  readonly suffix: string
  readonly headingPath: readonly string[]
}

export type ReviewEntryModel = {
  readonly id: string
  readonly parentId: string | null
  readonly depth: number
  readonly authorDisplayName: string
  readonly authorBadge: ReviewAuthorBadge
  readonly createdAt: string
  readonly updatedAt: string
  readonly source: string
}

export type ReviewThreadModel = {
  readonly id: string
  readonly anchorState: ReviewAnchorState
  readonly headingPath: readonly string[]
  readonly locator: ReviewLocator
  readonly entries: readonly ReviewEntryModel[]
}

export type ReviewAppendixModel = {
  readonly schemaVersion: typeof REVIEW_APPENDIX_SCHEMA_VERSION
  readonly articleSlug: string
  readonly documentFingerprint: string
  readonly snapshotAt: string
  readonly threads: readonly ReviewThreadModel[]
}

const STATE_LABEL: Record<ReviewAnchorState, string> = {
  attached: '已锚定',
  reattached: '已重连',
  orphaned: '失锚',
}

const AI_NOTE = [
  '> 本节由导出器生成，不属于文章正文；正文原文在本节之前，逐字节未改动。',
  '> 给 AI 的说明：每条是作者对正文某处的改稿意见。用 `exact` 配合 `prefix`/`suffix`',
  '> 在正文中定位——`startOffset`/`endOffset` 是渲染后纯文本坐标，不能直接切原文。',
  '> 改完请删除本节。',
].join('\n')

export function fenceLengthFor(content: string): number {
  let longest = 0
  let run = 0
  for (const char of content) {
    if (char === '`') {
      run += 1
      if (run > longest) longest = run
    } else {
      run = 0
    }
  }
  return Math.max(3, longest + 1)
}

export function renderFencedBlock(info: string, content: string): string {
  const ticks = '`'.repeat(fenceLengthFor(content))
  return `${ticks}${info}\n${content}\n${ticks}`
}

export function serializeReviewLocator(locator: ReviewLocator): string {
  return JSON.stringify({
    kind: locator.kind,
    threadId: locator.threadId,
    anchorState: locator.anchorState,
    protocolVersion: locator.protocolVersion,
    articleSlug: locator.articleSlug,
    documentFingerprint: locator.documentFingerprint,
    startBlockId: locator.startBlockId,
    startOffset: locator.startOffset,
    endBlockId: locator.endBlockId,
    endOffset: locator.endOffset,
    exact: locator.exact,
    prefix: locator.prefix,
    suffix: locator.suffix,
    headingPath: locator.headingPath,
  })
}

export function renderReviewAppendix(model: ReviewAppendixModel): string {
  const orphaned = model.threads.filter((thread) => thread.anchorState === 'orphaned').length
  const countLine =
    orphaned > 0
      ? `- 注释：${model.threads.length} 条（失锚 ${orphaned} 条）`
      : `- 注释：${model.threads.length} 条`

  const sections = model.threads.map((thread, index) => renderThread(thread, index + 1))
  return [
    REVIEW_APPENDIX_START,
    '',
    '## 审阅附录',
    '',
    AI_NOTE,
    '',
    `- 文章：\`${model.articleSlug}\``,
    `- 文档指纹：\`${model.documentFingerprint}\``,
    `- 快照时间：\`${model.snapshotAt}\``,
    countLine,
    '',
    ...sections,
    REVIEW_APPENDIX_END,
    '',
  ].join('\n')
}

export function freezeReviewAppendix(model: ReviewAppendixModel): ReviewAppendixModel {
  return Object.freeze({
    schemaVersion: model.schemaVersion,
    articleSlug: model.articleSlug,
    documentFingerprint: model.documentFingerprint,
    snapshotAt: model.snapshotAt,
    threads: Object.freeze(
      model.threads.map((thread) =>
        Object.freeze({
          id: thread.id,
          anchorState: thread.anchorState,
          headingPath: Object.freeze([...thread.headingPath]),
          locator: Object.freeze({
            ...thread.locator,
            headingPath: Object.freeze([...thread.locator.headingPath]),
          }),
          entries: Object.freeze(
            thread.entries.map((entry) => Object.freeze({ ...entry })),
          ),
        }),
      ),
    ),
  })
}

function renderThread(thread: ReviewThreadModel, ordinal: number): string {
  const heading = thread.headingPath.join(' / ') || '（无标题路径）'
  const entries = thread.entries.map((entry) => {
    const edited =
      entry.updatedAt !== entry.createdAt ? ` · 已编辑 ${entry.updatedAt}` : ''
    return [
      `**${entry.authorDisplayName}（${entry.authorBadge}）· ${entry.createdAt} · 第 ${entry.depth} 层${edited}**`,
      '',
      renderFencedBlock(REVIEW_ENTRY_INFO, entry.source),
    ].join('\n')
  })
  return [
    `### 注释 ${ordinal} · ${STATE_LABEL[thread.anchorState]}`,
    '',
    `**位置**：${heading}`,
    '',
    renderFencedBlock(REVIEW_LOCATOR_INFO, serializeReviewLocator(thread.locator)),
    '',
    ...entries,
    '',
  ].join('\n')
}
