import { Fragment, type ReactNode } from 'react'

import {
  assertDocumentBuildCanContinue,
  compileArticleDocumentWithDiagnostics,
  DOCUMENT_DIAGNOSTIC_DEFINITIONS,
  type BlockNode,
  type CompiledDocument,
  type DocumentDiagnostic,
  type DocumentNode,
  type ListItemNode,
  type RegisteredComponentNode,
  type TableCellNode,
  type TableRowNode,
} from '../core'
import {
  ARTICLE_PROFILE,
  DISCUSSION_PROFILE,
  EDITOR_PREVIEW_PROFILE,
  profileAllowsRenderer,
  type ScreenProfileDefinition,
} from '../profiles'
import {
  BUILTIN_RENDERER_REGISTRY,
  type RenderProfile,
} from '../registry'
import { sanitizeDiscussionRead } from '../security'
import { DocumentFallbackCard } from './fallback-card'
import { RegisteredRendererLeaf } from './registered-renderer-leaf'
import { RendererErrorBoundary } from './renderer-error-boundary'
import { ResourceImage } from './resource-image'

export type DocumentRendererProps = {
  readonly source: string
  readonly profile: RenderProfile
  readonly articleSlug: string
  readonly frontmatter?: unknown
  readonly assetManifest?: readonly unknown[]
  readonly className?: string
  /** @internal Only accepted by the editor-preview development fixture. */
  readonly developmentCrashComponentIds?: readonly string[]
}

type PreparedDocument = {
  readonly document?: CompiledDocument
  readonly diagnostics: readonly DocumentDiagnostic[]
}

export async function DocumentRenderer({
  source,
  profile,
  articleSlug,
  frontmatter = {},
  assetManifest = [],
  className,
  developmentCrashComponentIds,
}: DocumentRendererProps) {
  if (
    developmentCrashComponentIds &&
    (process.env.NODE_ENV === 'production' || profile !== 'editor-preview')
  ) {
    throw new Error('renderer 崩溃 fixture 只允许 editor-preview 开发环境。')
  }
  const prepared = await prepareDocument({
    source,
    profile,
    articleSlug,
    frontmatter,
    assetManifest,
  })
  const profileDefinition = profileByName(profile)
  const showDetails = process.env.NODE_ENV !== 'production'
  const unsafeDiscussion = profile === 'discussion' && !prepared.document
  const nodeDiagnostics = diagnosticsByNodeId(prepared.diagnostics)
  return (
    <article
      className={className}
      data-document-profile={profile}
      data-document-renderer="canonical"
    >
      {unsafeDiscussion ? (
        <DocumentFallbackCard
          code="DOC-SECURITY-004"
          details={showDetails ? prepared.diagnostics.map((item) => `${item.code}：${item.message}`).join('\n') : undefined}
          message="此条内容因安全规则变更暂不可显示。"
          nodeId={articleSlug}
        />
      ) : prepared.document ? (
        <DocumentRootContent
          articleSlug={articleSlug}
          developmentCrashComponentIds={developmentCrashComponentIds}
          diagnostics={prepared.diagnostics}
          nodeDiagnostics={nodeDiagnostics}
          nodes={prepared.document.root.children}
          profile={profileDefinition}
          rootRange={prepared.document.root.sourceRange}
          showDetails={showDetails}
        />
      ) : null}
    </article>
  )
}

async function prepareDocument(
  props: Omit<DocumentRendererProps, 'className'>,
): Promise<PreparedDocument> {
  const input = {
    source: props.source,
    articleSlug: props.articleSlug,
    frontmatter: props.frontmatter,
    assetManifest: props.assetManifest,
  }
  if (props.profile === 'article') {
    const result = await compileArticleDocumentWithDiagnostics(input)
    assertDocumentBuildCanContinue(result.diagnostics)
    return result
  }
  if (props.profile === 'discussion') {
    const read = await sanitizeDiscussionRead({
      entryId: props.articleSlug,
      source: props.source,
    })
    return read.safe
      ? { document: read.document, diagnostics: read.diagnostics }
      : { diagnostics: read.diagnostics }
  }
  const article = await compileArticleDocumentWithDiagnostics(input)
  return article
}

function profileByName(profile: RenderProfile): ScreenProfileDefinition {
  if (profile === 'article') return ARTICLE_PROFILE
  if (profile === 'discussion') return DISCUSSION_PROFILE
  return EDITOR_PREVIEW_PROFILE
}

function DiagnosticFallback({
  diagnostic,
  inline = false,
  showDetails,
}: {
  readonly diagnostic: DocumentDiagnostic
  readonly inline?: boolean
  readonly showDetails: boolean
}) {
  const message = DOCUMENT_DIAGNOSTIC_DEFINITIONS[diagnostic.code].message
  if (inline) {
    return (
      <span
        aria-label={`内容降级：${message}`}
        className="border-b border-dashed border-[var(--line)] text-[var(--ink-muted)]"
        data-document-fallback={diagnostic.code}
        data-node-id={diagnostic.nodeId ?? 'document'}
        role="status"
        title={showDetails ? diagnostic.message : undefined}
      >
        {message}
        <span className="sr-only">（{diagnostic.code}）</span>
      </span>
    )
  }
  return (
    <DocumentFallbackCard
      code={diagnostic.code}
      details={showDetails ? diagnostic.message : undefined}
      message={message}
      nodeId={diagnostic.nodeId}
      sourceRange={showDetails ? diagnostic.sourceRange : undefined}
    />
  )
}

function DocumentRootContent({
  nodes,
  diagnostics,
  rootRange,
  ...context
}: Omit<RenderContext, 'orphanDiagnostics'> & {
  readonly nodes: readonly BlockNode[]
  readonly diagnostics: readonly DocumentDiagnostic[]
  readonly rootRange: CompiledDocument['root']['sourceRange']
}) {
  return (
    <DocumentNodeChildren
      {...context}
      inlineFallback={false}
      nodes={nodes}
      orphanDiagnostics={diagnostics.filter((diagnostic) => !diagnostic.nodeId)}
      parentRange={rootRange}
    />
  )
}

function DocumentNodeChildren({
  inlineFallback,
  nodes,
  orphanDiagnostics,
  parentRange,
  ...context
}: RenderContext & {
  readonly inlineFallback: boolean
  readonly nodes: readonly DocumentNode[]
  readonly orphanDiagnostics: readonly DocumentDiagnostic[]
  readonly parentRange: CompiledDocument['root']['sourceRange']
}) {
  const directDiagnostics = orphanDiagnostics.filter((diagnostic) => {
    const range = diagnostic.sourceRange
    return (
      range !== undefined &&
      containsRange(parentRange, range) &&
      !nodes.some((node) => containsRange(node.sourceRange, range))
    )
  })
  const items: Array<
    | { readonly kind: 'node'; readonly node: DocumentNode; readonly offset: number }
    | { readonly kind: 'diagnostic'; readonly diagnostic: DocumentDiagnostic; readonly offset: number; readonly index: number }
  > = nodes.map((node) => ({ kind: 'node', node, offset: node.sourceRange.start.offset }))
  directDiagnostics.forEach((diagnostic, index) => items.push({
    kind: 'diagnostic',
    diagnostic,
    offset: diagnostic.sourceRange?.start.offset ?? Number.NEGATIVE_INFINITY,
    index,
  }))
  items.sort((left, right) => left.offset - right.offset)
  return items.map((item) => item.kind === 'node' ? (
    <Fragment key={item.node.nodeId}>{renderNode(item.node, { ...context, orphanDiagnostics })}</Fragment>
  ) : (
    <DiagnosticFallback
      diagnostic={item.diagnostic}
      inline={inlineFallback}
      key={`${item.diagnostic.code}-${item.offset}-${item.index}`}
      showDetails={context.showDetails}
    />
  ))
}

type RenderContext = {
  readonly articleSlug: string
  readonly developmentCrashComponentIds?: readonly string[]
  readonly nodeDiagnostics: ReadonlyMap<string, readonly DocumentDiagnostic[]>
  readonly orphanDiagnostics: readonly DocumentDiagnostic[]
  readonly profile: ScreenProfileDefinition
  readonly showDetails: boolean
}

function renderNode(node: DocumentNode, context: RenderContext): ReactNode {
  const diagnostics = context.nodeDiagnostics.get(node.nodeId) ?? []
  const forcedFallback = diagnostics.find((diagnostic) =>
    diagnostic.disposition === 'block-build' ||
    diagnostic.disposition === 'continue-with-fallback' ||
    diagnostic.disposition === 'safe-fallback',
  )
  if (forcedFallback) {
    return (
      <NodeDiagnosticFallback
        context={context}
        diagnostic={forcedFallback}
        inline={isInlineNode(node)}
        node={node}
        showDetails={context.showDetails}
      />
    )
  }
  if (!context.profile.allowedNodeTypes.includes(node.type)) {
    return (
      <DocumentFallbackCard
        code="DOC-REGISTRY-001"
        details={context.showDetails ? `节点类型：${node.type}` : undefined}
        message="这段内容不适用于当前显示模式。"
        nodeId={node.nodeId}
        sourceRange={context.showDetails ? node.sourceRange : undefined}
      />
    )
  }
  const children = (
    nodes: readonly DocumentNode[],
    inlineFallback = false,
  ) => (
    <DocumentNodeChildren
      {...context}
      inlineFallback={inlineFallback}
      nodes={nodes}
      orphanDiagnostics={context.orphanDiagnostics}
      parentRange={node.sourceRange}
    />
  )
  switch (node.type) {
    case 'root':
      return children(node.children)
    case 'heading':
      return <DocumentHeading node={node}>{children(node.children, true)}</DocumentHeading>
    case 'paragraph':
      return <p data-block-id={node.blockId}>{children(node.children, true)}</p>
    case 'text':
      return node.value
    case 'emphasis':
      return <em>{children(node.children, true)}</em>
    case 'strong':
      return <strong>{children(node.children, true)}</strong>
    case 'delete':
      return <del>{children(node.children, true)}</del>
    case 'link':
      return (
        <a href={node.url} rel={externalRel(node.url)} title={node.title}>
          {children(node.children, true)}
        </a>
      )
    case 'list':
      return node.ordered ? (
        <ol data-block-id={node.blockId} start={node.start}>
          {children(node.children)}
        </ol>
      ) : (
        <ul data-block-id={node.blockId}>{children(node.children)}</ul>
      )
    case 'listItem':
      return <ListItem node={node}>{children(node.children)}</ListItem>
    case 'quote':
      return <blockquote data-block-id={node.blockId}>{children(node.children)}</blockquote>
    case 'table':
      return (
        <div className="overflow-x-auto" data-block-id={node.blockId}>
          <table><tbody>{children(node.children)}</tbody></table>
        </div>
      )
    case 'tableRow':
      return <TableRow context={context} node={node} />
    case 'tableCell':
      return <TableCell context={context} node={node} />
    case 'inlineCode':
      return <code>{node.value}</code>
    case 'code':
      return (
        <pre data-block-id={node.blockId} data-language={node.language}>
          <code>{node.value}</code>
        </pre>
      )
    case 'math':
      return node.display ? (
        <pre data-block-id={node.blockId} data-math="display">{node.value}</pre>
      ) : (
        <code data-math="inline">{node.value}</code>
      )
    case 'mermaid':
      return (
        <DocumentFallbackCard
          code="DOC-RENDER-002"
          message="这张 Mermaid 图暂未渲染，已保留图表源码。"
          nodeId={node.nodeId}
        >
          <pre>{node.value}</pre>
        </DocumentFallbackCard>
      )
    case 'image':
      return (
        <ResourceImage
          key={node.src}
          node={node}
          showDetails={context.showDetails}
          src={resolveImageSource(node.src, context.articleSlug)}
        />
      )
    case 'registeredComponent':
      return <RegisteredComponent context={context} node={node} />
    case 'footnoteReference':
      return <sup><a href={`#footnote-${encodeURIComponent(node.identifier)}`}>[{node.identifier}]</a></sup>
    case 'footnoteDefinition':
      return (
        <aside data-block-id={node.blockId} id={`footnote-${encodeURIComponent(node.identifier)}`}>
          {children(node.children)}
        </aside>
      )
    case 'thematicBreak':
      return <hr data-block-id={node.blockId} />
  }
}

function ListItem({ node, children }: { readonly node: ListItemNode; readonly children: ReactNode }) {
  return (
    <li data-block-id={node.blockId}>
      {node.checked === undefined ? null : (
        <input aria-label={node.checked ? '已完成' : '未完成'} checked={node.checked} disabled readOnly type="checkbox" />
      )}
      {children}
    </li>
  )
}

function DocumentHeading({
  node,
  children,
}: {
  readonly node: Extract<BlockNode, { type: 'heading' }>
  readonly children: ReactNode
}) {
  if (node.depth === 1) return <h1 id={node.slug}>{children}</h1>
  if (node.depth === 2) return <h2 id={node.slug}>{children}</h2>
  if (node.depth === 3) return <h3 id={node.slug}>{children}</h3>
  if (node.depth === 4) return <h4 id={node.slug}>{children}</h4>
  if (node.depth === 5) return <h5 id={node.slug}>{children}</h5>
  return <h6 id={node.slug}>{children}</h6>
}

function TableRow({ node, context }: { readonly node: TableRowNode; readonly context: RenderContext }) {
  return <tr><DocumentNodeChildren {...context} inlineFallback={false} nodes={node.children} orphanDiagnostics={context.orphanDiagnostics} parentRange={node.sourceRange} /></tr>
}

function TableCell({ node, context }: { readonly node: TableCellNode; readonly context: RenderContext }) {
  return <td data-block-id={node.blockId}><DocumentNodeChildren {...context} inlineFallback nodes={node.children} orphanDiagnostics={context.orphanDiagnostics} parentRange={node.sourceRange} /></td>
}

function RegisteredComponent({
  node,
  context,
}: {
  readonly node: RegisteredComponentNode
  readonly context: RenderContext
}) {
  const definition = BUILTIN_RENDERER_REGISTRY.get(node.name)
  const allowed =
    definition !== undefined &&
    definition.allowedProfiles.includes(context.profile.name) &&
    profileAllowsRenderer(context.profile, node.name)
  const alternative = node.children.length > 0
    ? <DocumentNodeChildren {...context} inlineFallback={false} nodes={node.children} orphanDiagnostics={context.orphanDiagnostics} parentRange={node.sourceRange} />
    : node.canonicalText
  if (!allowed) {
    return (
      <DocumentFallbackCard
        code="DOC-REGISTRY-001"
        details={context.showDetails ? `renderer：${node.name}` : undefined}
        message="这个内容组件当前不可用，已显示替代内容。"
        nodeId={node.nodeId}
        sourceRange={context.showDetails ? node.sourceRange : undefined}
      >
        {alternative}
      </DocumentFallbackCard>
    )
  }
  return (
    <RendererErrorBoundary
      alternative={alternative}
      nodeId={node.nodeId}
      rendererName={node.name}
      showDetails={context.showDetails}
    >
      <RegisteredRendererLeaf
        alternative={alternative}
        developmentCrash={
          context.developmentCrashComponentIds?.includes(node.componentId) === true
        }
        node={node}
        profile={context.profile.name}
        showDetails={context.showDetails}
      />
    </RendererErrorBoundary>
  )
}

function NodeDiagnosticFallback({
  context,
  diagnostic,
  inline,
  node,
  showDetails,
}: {
  readonly context: RenderContext
  readonly diagnostic: DocumentDiagnostic
  readonly inline: boolean
  readonly node: DocumentNode
  readonly showDetails: boolean
}) {
  const message = DOCUMENT_DIAGNOSTIC_DEFINITIONS[diagnostic.code].message
  if (inline) {
    return (
      <span
        aria-label={`内容降级：${message}`}
        className="border-b border-dashed border-[var(--line)] text-[var(--ink-muted)]"
        data-document-fallback={diagnostic.code}
        data-node-id={node.nodeId}
        role="status"
        title={showDetails ? diagnostic.message : undefined}
      >
        {safeNodeText(node) || '此处内容不可用'}
        <span className="sr-only">（{diagnostic.code}，关联 ID：{node.nodeId}）</span>
      </span>
    )
  }
  return (
    <DocumentFallbackCard
      code={diagnostic.code}
      details={showDetails ? diagnostic.message : undefined}
      message={message}
      nodeId={node.nodeId}
      sourceRange={showDetails ? diagnostic.sourceRange : undefined}
    >
      {node.type === 'registeredComponent' && node.children.length > 0
        ? <DocumentNodeChildren {...context} inlineFallback={false} nodes={node.children} orphanDiagnostics={context.orphanDiagnostics} parentRange={node.sourceRange} />
        : node.canonicalText}
    </DocumentFallbackCard>
  )
}

function diagnosticsByNodeId(
  diagnostics: readonly DocumentDiagnostic[],
): ReadonlyMap<string, readonly DocumentDiagnostic[]> {
  const grouped = new Map<string, DocumentDiagnostic[]>()
  for (const diagnostic of diagnostics) {
    if (!diagnostic.nodeId) continue
    const current = grouped.get(diagnostic.nodeId) ?? []
    current.push(diagnostic)
    grouped.set(diagnostic.nodeId, current)
  }
  return grouped
}

function isInlineNode(node: DocumentNode): boolean {
  return [
    'text',
    'emphasis',
    'strong',
    'delete',
    'link',
    'inlineCode',
    'footnoteReference',
  ].includes(node.type) || (node.type === 'math' && !node.display) || (node.type === 'image' && node.placement === 'inline')
}

function safeNodeText(node: DocumentNode): string {
  if (node.canonicalText) return node.canonicalText
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map((child) => safeNodeText(child)).join('')
  }
  return ''
}

function containsRange(
  container: CompiledDocument['root']['sourceRange'],
  candidate: CompiledDocument['root']['sourceRange'],
): boolean {
  return (
    candidate.start.offset >= container.start.offset &&
    candidate.end.offset <= container.end.offset
  )
}

function externalRel(url: string): string | undefined {
  return url.startsWith('https://') ? 'nofollow ugc noopener noreferrer' : undefined
}

function resolveImageSource(source: string, articleSlug: string): string {
  if (!source.startsWith('./')) return source
  const path = source
    .slice(2)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `/blog/${encodeURIComponent(articleSlug)}/${path}`
}
