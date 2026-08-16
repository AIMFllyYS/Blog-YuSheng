import {
  assertDocumentBuildCanContinue,
  createDocumentDiagnostic,
  type DocumentDiagnostic,
} from './diagnostics'
import {
  DOCUMENT_PROTOCOL_VERSION,
  DOCUMENT_SCHEMA_VERSION,
  type BlockImageNode,
  type BlockNode,
  type CompiledDocument,
  type InlineNode,
  type RootNode,
  type SourceMapSegment,
  type SourceRange,
} from './document-types'
import { parseComponentSyntax } from './component-syntax'
import { parseDocument, type MarkdownNode } from './parse-document'
import {
  createDocumentFingerprint,
  createStableBlockId,
  normalizeBlockCanonicalText,
  StableIdAllocator,
  type StableBlockNodeType,
} from './stable-ids'

export type CompileDocumentInput = {
  articleSlug: string
  source: string
  frontmatter: unknown
  assetManifest?: readonly unknown[]
}

export type DocumentCompilationResult = {
  document: CompiledDocument
  diagnostics: readonly DocumentDiagnostic[]
}

type CompileContext = {
  input: CompileDocumentInput
  allocator: StableIdAllocator
  diagnostics: DocumentDiagnostic[]
  sourceMap: Record<string, readonly SourceMapSegment[]>
  headingStack: Array<{ depth: number; slug: string }>
  definitions: ReadonlyMap<string, MarkdownNode>
}

type InlineResult = {
  nodes: InlineNode[]
  canonicalText: string
  segments: SourceMapSegment[]
}

export async function compileDocument(
  input: CompileDocumentInput,
): Promise<DocumentCompilationResult> {
  const ast = parseDocument(input.source)
  const context: CompileContext = {
    input,
    allocator: new StableIdAllocator(input.articleSlug),
    diagnostics: [],
    sourceMap: {},
    headingStack: [],
    definitions: collectDefinitions(ast),
  }
  const children = await compileBlocks(ast.children ?? [], context, [])
  const root: RootNode = {
    type: 'root',
    nodeId: 'root',
    sourceRange: rangeOf(ast, input.source),
    sourceText: input.source,
    children,
  }
  return {
    document: {
      schemaVersion: DOCUMENT_SCHEMA_VERSION,
      protocolVersion: DOCUMENT_PROTOCOL_VERSION,
      articleSlug: input.articleSlug,
      documentFingerprint: await createDocumentFingerprint(input.source),
      frontmatter: input.frontmatter,
      root,
      originalSource: input.source,
      assetManifest: input.assetManifest ?? [],
      sourceMap: Object.freeze({ ...context.sourceMap }),
    },
    diagnostics: context.diagnostics,
  }
}

export async function compileArticleDocument(
  input: CompileDocumentInput,
): Promise<CompiledDocument> {
  const result = await compileDocument(input)
  assertDocumentBuildCanContinue(result.diagnostics)
  return result.document
}

async function compileBlocks(
  nodes: readonly MarkdownNode[],
  context: CompileContext,
  structuralPath: readonly string[],
): Promise<BlockNode[]> {
  const blocks: BlockNode[] = []
  let siblingIndex = 0
  for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
    let node = nodes[nodeIndex]!
    const combined = combinePairedComponent(node, context.input.source)
    if (combined) {
      node = combined
      while (
        nodeIndex + 1 < nodes.length &&
        (nodes[nodeIndex + 1]!.position?.start.offset ?? Number.POSITIVE_INFINITY) <
          combined.position!.end.offset!
      ) {
        nodeIndex += 1
      }
    }
    if (node.type === 'yaml' || node.type === 'definition') continue
    const block = await compileBlock(node, context, structuralPath, siblingIndex)
    if (block) {
      blocks.push(block)
      siblingIndex += 1
    }
  }
  return blocks
}

function combinePairedComponent(
  node: MarkdownNode,
  source: string,
): MarkdownNode | undefined {
  if (node.type !== 'html' || typeof node.value !== 'string') return undefined
  const name = node.value.match(/^<(html-embed|web-embed)\b/)?.[1]
  if (!name || new RegExp(`<\\/${name}\\s*>`).test(node.value)) {
    return undefined
  }
  const startOffset = node.position?.start.offset
  if (startOffset === undefined) return undefined
  const closingPattern = new RegExp(`<\\/${name}\\s*>`, 'g')
  closingPattern.lastIndex = startOffset + node.value.length
  const closingMatch = closingPattern.exec(source)
  if (!closingMatch) return undefined
  const endOffset = closingMatch.index + closingMatch[0].length
  const logical = stripContainerContinuationPrefixes(
    source.slice(startOffset, endOffset),
    startOffset,
    Math.max(0, (node.position?.start.column ?? 1) - 1),
  )
  return {
    type: 'html',
    value: logical.value,
    sourceOffsetMap: logical.offsetMap,
    position: {
      start: pointFromOffset(source, startOffset),
      end: pointFromOffset(source, endOffset),
    },
  }
}

function stripContainerContinuationPrefixes(
  raw: string,
  absoluteStart: number,
  prefixWidth: number,
): { value: string; offsetMap: readonly number[] } {
  let value = ''
  const offsetMap: number[] = []
  let cursor = 0
  let firstLine = true
  while (cursor < raw.length) {
    const lineEnd = raw.indexOf('\n', cursor)
    const contentEnd = lineEnd >= 0 ? lineEnd : raw.length
    let contentStart = cursor
    if (!firstLine && prefixWidth > 0) {
      let removed = 0
      while (
        removed < prefixWidth &&
        contentStart + removed < contentEnd &&
        (raw[contentStart + removed] === ' ' ||
          raw[contentStart + removed] === '\t' ||
          raw[contentStart + removed] === '>')
      ) {
        removed += 1
      }
      contentStart += removed
    }
    for (let index = contentStart; index < contentEnd; index += 1) {
      offsetMap.push(absoluteStart + index)
      value += raw[index]
    }
    if (lineEnd >= 0) {
      offsetMap.push(absoluteStart + lineEnd)
      value += '\n'
      cursor = lineEnd + 1
    } else {
      cursor = raw.length
    }
    firstLine = false
  }
  offsetMap.push(absoluteStart + raw.length)
  return { value, offsetMap }
}

async function compileBlock(
  node: MarkdownNode,
  context: CompileContext,
  structuralPath: readonly string[],
  siblingIndex: number,
): Promise<BlockNode | undefined> {
  const range = rangeOf(node, context.input.source)
  const sourceText = sliceRange(context.input.source, range)
  if (node.type === 'heading') {
    const inline = compileInline(node.children ?? [], context)
    const slug = context.allocator.allocateHeading(inline.canonicalText)
    const depth = asHeadingDepth(node.depth)
    while (
      context.headingStack.at(-1) &&
      context.headingStack.at(-1)!.depth >= depth
    ) {
      context.headingStack.pop()
    }
    context.headingStack.push({ depth, slug })
    const blockId = slug
    context.sourceMap[blockId] = inline.segments
    return {
      type: 'heading',
      nodeId: `heading:${slug}`,
      blockId,
      slug,
      depth,
      canonicalText: inline.canonicalText,
      sourceRange: range,
      sourceText,
      children: inline.nodes,
    }
  }
  if (node.type === 'paragraph') {
    if (node.children?.length === 1 && node.children[0]?.type === 'html') {
      return compileHtmlComponent(node.children[0], context, structuralPath, siblingIndex)
    }
    const inline = compileInline(node.children ?? [], context)
    if (inline.nodes.length === 1 && inline.nodes[0]?.type === 'image') {
      const image = inline.nodes[0]
      const blockId = await blockIdFor(
        context,
        structuralPath,
        'image',
        siblingIndex,
        image.alt,
      )
      const dimensions = findImageDimensions(
        context.input.assetManifest ?? [],
        context.input.articleSlug,
        image.src,
      )
      const blockImage: BlockImageNode = {
        ...image,
        placement: 'block',
        blockId,
        canonicalText: image.alt.normalize('NFC'),
        ...dimensions,
      }
      context.sourceMap[blockId] = shiftSegments(inline.segments, 0)
      return blockImage
    }
    const blockId = await blockIdFor(
      context,
      structuralPath,
      'paragraph',
      siblingIndex,
      inline.canonicalText,
    )
    context.sourceMap[blockId] = inline.segments
    return {
      type: 'paragraph',
      nodeId: blockId,
      blockId,
      canonicalText: inline.canonicalText,
      sourceRange: range,
      sourceText,
      children: inline.nodes,
    }
  }
  if (node.type === 'code') {
    const value = stringValue(node.value)
    const type = node.lang === 'mermaid' ? 'mermaid' : 'code'
    const canonicalText = normalizeBlockCanonicalText(type, value)
    const blockId = await blockIdFor(context, structuralPath, type, siblingIndex, canonicalText)
    context.sourceMap[blockId] = [atomicSegment(node, blockId, canonicalText, context)]
    return type === 'mermaid'
      ? {
          type,
          nodeId: blockId,
          blockId,
          value,
          canonicalText,
          sourceRange: range,
          sourceText,
        }
      : {
          type,
          nodeId: blockId,
          blockId,
          language: typeof node.lang === 'string' ? node.lang : undefined,
          meta: typeof node.meta === 'string' ? node.meta : undefined,
          value,
          canonicalText,
          sourceRange: range,
          sourceText,
        }
  }
  if (node.type === 'math') {
    const value = stringValue(node.value)
    const blockId = await blockIdFor(context, structuralPath, 'math', siblingIndex, value)
    context.sourceMap[blockId] = [atomicSegment(node, blockId, value, context)]
    return {
      type: 'math',
      display: true,
      nodeId: blockId,
      blockId,
      value,
      canonicalText: value,
      sourceRange: range,
      sourceText,
    }
  }
  if (node.type === 'thematicBreak') {
    const blockId = await blockIdFor(
      context,
      structuralPath,
      'thematicBreak',
      siblingIndex,
      sourceText,
    )
    context.sourceMap[blockId] = []
    return {
      type: 'thematicBreak',
      nodeId: blockId,
      blockId,
      canonicalText: '',
      sourceRange: range,
      sourceText,
    }
  }
  if (node.type === 'list') {
    const itemNodes = node.children ?? []
    const itemTexts = itemNodes.map((item) =>
      canonicalBlockText(item.children ?? [], context.input.source),
    )
    const canonicalText = itemTexts.join('\n')
    const blockId = await blockIdFor(context, structuralPath, 'list', siblingIndex, canonicalText)
    const children = []
    for (let index = 0; index < itemNodes.length; index += 1) {
      const item = itemNodes[index]!
      const itemText = itemTexts[index] ?? ''
      const itemId = await createStableBlockId({
        headingPath: [...currentHeadingPath(context), ...structuralPath, blockId],
        blockType: 'listItem',
        siblingIndex: index,
        canonicalText: itemText,
      })
      const itemChildren = await compileBlocks(item.children ?? [], context, [
        ...structuralPath,
        blockId,
        itemId,
      ])
      const compiledItemText = itemChildren
        .map((child) => child.canonicalText)
        .join('\n')
      children.push({
        type: 'listItem' as const,
        nodeId: itemId,
        blockId: itemId,
        checked: typeof item.checked === 'boolean' ? item.checked : undefined,
        canonicalText: compiledItemText,
        sourceRange: rangeOf(item, context.input.source),
        sourceText: sliceRange(context.input.source, rangeOf(item, context.input.source)),
        children: itemChildren,
      })
      context.sourceMap[itemId] = collectChildSegments(itemChildren, context)
    }
    context.sourceMap[blockId] = collectChildSegments(children, context)
    return {
      type: 'list',
      nodeId: blockId,
      blockId,
      ordered: node.ordered === true,
      start: typeof node.start === 'number' ? node.start : undefined,
      canonicalText,
      sourceRange: range,
      sourceText,
      children,
    }
  }
  if (node.type === 'blockquote') {
    const canonicalText = canonicalBlockText(
      node.children ?? [],
      context.input.source,
    )
    const blockId = await blockIdFor(context, structuralPath, 'quote', siblingIndex, canonicalText)
    const children = await compileBlocks(node.children ?? [], context, [
      ...structuralPath,
      blockId,
    ])
    context.sourceMap[blockId] = collectChildSegments(children, context)
    return {
      type: 'quote',
      nodeId: blockId,
      blockId,
      canonicalText,
      sourceRange: range,
      sourceText,
      children,
    }
  }
  if (node.type === 'table') {
    const rows = []
    const rowTexts: string[] = []
    let cellIndex = 0
    const canonicalText = (node.children ?? [])
      .map((row) =>
        (row.children ?? [])
          .map((cell) => canonicalNodeText(cell, context.input.source))
          .join('\t'),
      )
      .join('\n')
    const blockId = await blockIdFor(context, structuralPath, 'table', siblingIndex, canonicalText)
    for (const [rowIndex, row] of (node.children ?? []).entries()) {
      const cells = []
      const cellTexts: string[] = []
      for (const cell of row.children ?? []) {
        const inline = compileInline(cell.children ?? [], context)
        const cellId = await createStableBlockId({
          headingPath: [...currentHeadingPath(context), ...structuralPath, blockId],
          blockType: 'tableCell',
          siblingIndex: cellIndex,
          canonicalText: inline.canonicalText,
        })
        cellIndex += 1
        context.sourceMap[cellId] = inline.segments
        cells.push({
          type: 'tableCell' as const,
          nodeId: cellId,
          blockId: cellId,
          canonicalText: inline.canonicalText,
          sourceRange: rangeOf(cell, context.input.source),
          sourceText: sliceRange(context.input.source, rangeOf(cell, context.input.source)),
          children: inline.nodes,
        })
        cellTexts.push(inline.canonicalText)
      }
      rowTexts.push(cellTexts.join('\t'))
      rows.push({
        type: 'tableRow' as const,
        nodeId: `table-row-${range.start.offset}-${rowIndex}`,
        sourceRange: rangeOf(row, context.input.source),
        sourceText: sliceRange(context.input.source, rangeOf(row, context.input.source)),
        children: cells,
      })
    }
    const compiledCanonicalText = rowTexts.join('\n')
    context.sourceMap[blockId] = collectChildSegments(rows.flatMap((row) => row.children), context)
    return {
      type: 'table',
      nodeId: blockId,
      blockId,
      align: Array.isArray(node.align)
        ? node.align.map((value) =>
            value === 'left' || value === 'center' || value === 'right' ? value : null,
          )
        : [],
      canonicalText: compiledCanonicalText,
      sourceRange: range,
      sourceText,
      children: rows,
    }
  }
  if (node.type === 'footnoteDefinition') {
    const canonicalText = canonicalBlockText(
      node.children ?? [],
      context.input.source,
    )
    const blockId = await blockIdFor(
      context,
      structuralPath,
      'footnoteDefinition',
      siblingIndex,
      canonicalText,
    )
    const children = await compileBlocks(node.children ?? [], context, [
      ...structuralPath,
      blockId,
    ])
    context.sourceMap[blockId] = collectChildSegments(children, context)
    return {
      type: 'footnoteDefinition',
      nodeId: blockId,
      blockId,
      identifier: stringValue(node.identifier),
      canonicalText,
      sourceRange: range,
      sourceText,
      children,
    }
  }
  if (node.type === 'html') {
    return compileHtmlComponent(node, context, structuralPath, siblingIndex)
  }
  context.diagnostics.push(
    createDocumentDiagnostic('DOC-PARSE-002', {
      articleSlug: context.input.articleSlug,
      sourceRange: range,
      message: `无法编译 Markdown 节点：${node.type}`,
    }),
  )
  return undefined
}

function compileInline(nodes: readonly MarkdownNode[], context: CompileContext): InlineResult {
  const result: InlineResult = { nodes: [], canonicalText: '', segments: [] }
  for (const node of nodes) {
    const range = rangeOf(node, context.input.source)
    const nodeId = `inline-${node.type}-${range.start.offset}`
    const append = (inline: InlineResult) => {
      const offset = result.canonicalText.length
      result.nodes.push(...inline.nodes)
      result.canonicalText += inline.canonicalText
      result.segments.push(...shiftSegments(inline.segments, offset))
    }
    if (node.type === 'text') {
      const originalValue = stringValue(node.value)
      const value = originalValue.normalize('NFC')
      append({
        nodes: [{ type: 'text', nodeId, value, canonicalText: value, sourceRange: range, sourceText: sliceRange(context.input.source, range) }],
        canonicalText: value,
        segments: textSegments(node, nodeId, originalValue, context),
      })
      continue
    }
    if (node.type === 'inlineCode') {
      const value = stringValue(node.value).replace(/\r\n?/g, '\n')
      append({
        nodes: [{ type: 'inlineCode', nodeId, value, canonicalText: value, sourceRange: range, sourceText: sliceRange(context.input.source, range) }],
        canonicalText: value,
        segments: [atomicSegment(node, nodeId, value, context)],
      })
      continue
    }
    if (node.type === 'inlineMath') {
      const value = stringValue(node.value)
      append({
        nodes: [{ type: 'math', display: false, nodeId, value, canonicalText: value, sourceRange: range, sourceText: sliceRange(context.input.source, range) }],
        canonicalText: value,
        segments: [atomicSegment(node, nodeId, value, context)],
      })
      continue
    }
    if (node.type === 'image') {
      const alt = stringValue(node.alt).normalize('NFC')
      append({
        nodes: [{ type: 'image', placement: 'inline', nodeId, src: stringValue(node.url), alt, title: typeof node.title === 'string' ? node.title : undefined, sourceRange: range, sourceText: sliceRange(context.input.source, range), ...findImageDimensions(context.input.assetManifest ?? [], context.input.articleSlug, stringValue(node.url)) }],
        canonicalText: alt,
        segments: [atomicSegment(node, nodeId, alt, context)],
      })
      continue
    }
    if (node.type === 'imageReference') {
      const definition = context.definitions.get(
        stringValue(node.identifier).toLowerCase(),
      )
      if (!definition || typeof definition.url !== 'string') {
        context.diagnostics.push(createDocumentDiagnostic('DOC-PARSE-002', {
          articleSlug: context.input.articleSlug,
          sourceRange: range,
          message: `图片引用没有有效定义：${stringValue(node.identifier)}`,
        }))
        continue
      }
      const alt = stringValue(node.alt).normalize('NFC')
      append({
        nodes: [{ type: 'image', placement: 'inline', nodeId, src: definition.url, alt, title: typeof definition.title === 'string' ? definition.title : undefined, sourceRange: range, sourceText: sliceRange(context.input.source, range), ...findImageDimensions(context.input.assetManifest ?? [], context.input.articleSlug, definition.url) }],
        canonicalText: alt,
        segments: [atomicSegment(node, nodeId, alt, context)],
      })
      continue
    }
    if (node.type === 'footnoteReference') {
      const identifier = stringValue(node.identifier)
      const value = `[${identifier}]`
      append({
        nodes: [{ type: 'footnoteReference', nodeId, identifier, canonicalText: value, sourceRange: range, sourceText: sliceRange(context.input.source, range) }],
        canonicalText: value,
        segments: [atomicSegment(node, nodeId, value, context)],
      })
      continue
    }
    if (node.type === 'break') {
      append({
        nodes: [{ type: 'text', nodeId, value: '\n', canonicalText: '\n', sourceRange: range, sourceText: sliceRange(context.input.source, range) }],
        canonicalText: '\n',
        segments: [{ nodeId, canonicalStart: 0, canonicalEnd: 1, sourceStart: range.start.offset, sourceEnd: range.end.offset, kind: 'soft-break' }],
      })
      continue
    }
    if (node.type === 'linkReference') {
      const definition = context.definitions.get(
        stringValue(node.identifier).toLowerCase(),
      )
      if (!definition || typeof definition.url !== 'string') {
        context.diagnostics.push(createDocumentDiagnostic('DOC-PARSE-002', {
          articleSlug: context.input.articleSlug,
          sourceRange: range,
          message: `链接引用没有有效定义：${stringValue(node.identifier)}`,
        }))
        continue
      }
      const children = compileInline(node.children ?? [], context)
      append({
        nodes: [{ type: 'link', nodeId, url: definition.url, title: typeof definition.title === 'string' ? definition.title : undefined, sourceRange: range, sourceText: sliceRange(context.input.source, range), children: children.nodes }],
        canonicalText: children.canonicalText,
        segments: children.segments,
      })
      continue
    }
    if (node.type === 'html') {
      const parsed = parseComponentSyntax(stringValue(node.value), range)
      const code = parsed.kind === 'unknown-tag'
        ? 'DOC-REGISTRY-001'
        : parsed.kind === 'raw-html'
          ? 'DOC-PARSE-001'
          : parsed.kind === 'invalid' && parsed.reason === 'attribute'
            ? 'DOC-REGISTRY-002'
            : 'DOC-PARSE-003'
      context.diagnostics.push(createDocumentDiagnostic(code, {
        articleSlug: context.input.articleSlug,
        sourceRange: range,
        message:
          parsed.kind === 'component'
            ? '注册组件只能作为独立语义块使用。'
            : parsed.kind === 'invalid'
              ? parsed.message
              : undefined,
      }))
      continue
    }
    if (node.type === 'emphasis' || node.type === 'strong' || node.type === 'delete' || node.type === 'link') {
      const children = compileInline(node.children ?? [], context)
      const common = { nodeId, sourceRange: range, sourceText: sliceRange(context.input.source, range), children: children.nodes }
      const wrapper: InlineNode = node.type === 'link'
        ? { type: 'link', url: stringValue(node.url), title: typeof node.title === 'string' ? node.title : undefined, ...common }
        : node.type === 'emphasis'
          ? { type: 'emphasis', ...common }
          : node.type === 'strong'
            ? { type: 'strong', ...common }
            : { type: 'delete', ...common }
      append({ nodes: [wrapper], canonicalText: children.canonicalText, segments: children.segments })
      continue
    }
    context.diagnostics.push(createDocumentDiagnostic('DOC-PARSE-002', {
      articleSlug: context.input.articleSlug,
      sourceRange: range,
      message: `无法编译行内 Markdown 节点：${node.type}`,
    }))
  }
  return result
}

async function compileHtmlComponent(node: MarkdownNode, context: CompileContext, structuralPath: readonly string[], siblingIndex: number): Promise<BlockNode | undefined> {
  const range = rangeOf(node, context.input.source)
  const raw = stringValue(node.value)
  const parsed = parseComponentSyntax(raw, range)
  if (parsed.kind !== 'component') {
    const code = parsed.kind === 'unknown-tag'
      ? 'DOC-REGISTRY-001'
      : parsed.kind === 'raw-html'
        ? 'DOC-PARSE-001'
        : parsed.reason === 'attribute'
          ? 'DOC-REGISTRY-002'
          : 'DOC-PARSE-003'
    context.diagnostics.push(createDocumentDiagnostic(code, {
      articleSlug: context.input.articleSlug,
      sourceRange: range,
      message: parsed.kind === 'invalid' ? parsed.message : undefined,
    }))
    return undefined
  }
  const allocated = context.allocator.allocateComponent(parsed.component.id, range)
  if (allocated.diagnostic) context.diagnostics.push(allocated.diagnostic)
  let fallbackNodes: MarkdownNode[] = []
  if (parsed.component.fallbackSource) {
    const fallbackAst = parseDocument(parsed.component.fallbackSource)
    shiftMarkdownPositions(
      fallbackAst,
      range.start.offset + parsed.component.fallbackOffset,
      context.input.source,
      node.sourceOffsetMap,
      parsed.component.fallbackOffset,
    )
    fallbackNodes = (fallbackAst.children ?? []).filter(
      (child) => child.type !== 'yaml' && child.type !== 'definition',
    )
  }
  const fallbackCanonicalText = canonicalBlockText(
    fallbackNodes,
    parsed.component.fallbackSource,
  )
  const canonicalText = fallbackCanonicalText || String(parsed.component.attributes.title ?? parsed.component.name)
  const blockId = await blockIdFor(context, structuralPath, 'registeredComponent', siblingIndex, canonicalText)
  const savedHeadingStack = [...context.headingStack]
  const children = await compileBlocks(fallbackNodes, context, [
    ...structuralPath,
    blockId,
  ])
  context.headingStack = savedHeadingStack
  context.sourceMap[blockId] = [atomicSegment(node, allocated.nodeId, canonicalText, context)]
  return { type: 'registeredComponent', nodeId: allocated.nodeId, componentId: parsed.component.id, blockId, name: parsed.component.name, attributes: parsed.component.attributes, selectable: 'none', canonicalText, sourceRange: range, sourceText: sliceRange(context.input.source, range), children }
}

async function blockIdFor(context: CompileContext, structuralPath: readonly string[], blockType: StableBlockNodeType, siblingIndex: number, canonicalText: string) {
  return createStableBlockId({ headingPath: [...currentHeadingPath(context), ...structuralPath], blockType, siblingIndex, canonicalText })
}

function currentHeadingPath(context: CompileContext): string[] {
  return context.headingStack.map((heading) => heading.slug)
}

function shiftMarkdownPositions(
  node: MarkdownNode,
  offset: number,
  source: string,
  offsetMap?: readonly number[],
  mapBase = 0,
): void {
  if (node.position) {
    const relativeStart = node.position.start.offset ?? 0
    const relativeEnd = node.position.end.offset ?? 0
    const startOffset =
      offsetMap?.[mapBase + relativeStart] ?? offset + relativeStart
    const endOffset = offsetMap?.[mapBase + relativeEnd] ?? offset + relativeEnd
    node.position = {
      start: pointFromOffset(source, startOffset),
      end: pointFromOffset(source, endOffset),
    }
  }
  for (const child of node.children ?? []) {
    shiftMarkdownPositions(child, offset, source, offsetMap, mapBase)
  }
}

function pointFromOffset(source: string, offset: number) {
  const lines = source.slice(0, offset).split(/\r\n|\r|\n/)
  return {
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
    offset,
  }
}

function rangeOf(node: MarkdownNode, source: string): SourceRange {
  const start = node.position?.start
  const end = node.position?.end
  return {
    start: { line: start?.line ?? 1, column: start?.column ?? 1, offset: start?.offset ?? 0 },
    end: { line: end?.line ?? 1, column: end?.column ?? 1, offset: end?.offset ?? source.length },
  }
}

function sliceRange(source: string, range: SourceRange) {
  return source.slice(range.start.offset, range.end.offset)
}

function stringValue(value: unknown) { return typeof value === 'string' ? value : '' }
function asHeadingDepth(value: unknown): 1 | 2 | 3 | 4 | 5 | 6 { return value === 2 || value === 3 || value === 4 || value === 5 || value === 6 ? value : 1 }
function canonicalNodeText(node: MarkdownNode, source: string): string {
  if (node.type === 'break') return '\n'
  if (node.type === 'image' || node.type === 'imageReference') {
    return stringValue(node.alt).normalize('NFC')
  }
  if (node.type === 'footnoteReference') {
    return `[${stringValue(node.identifier)}]`
  }
  if (
    node.type === 'code' ||
    node.type === 'inlineCode' ||
    node.type === 'mermaid'
  ) {
    return stringValue(node.value).replace(/\r\n?/g, '\n')
  }
  if (node.type === 'math' || node.type === 'inlineMath') {
    return stringValue(node.value)
  }
  if (node.type === 'html') {
    const parsed = parseComponentSyntax(stringValue(node.value), rangeOf(node, ''))
    if (parsed.kind !== 'component') return ''
    if (parsed.component.fallbackSource) {
      const fallback = parseDocument(parsed.component.fallbackSource)
      return canonicalBlockText(
        fallback.children ?? [],
        parsed.component.fallbackSource,
      )
    }
    return String(parsed.component.attributes.title ?? parsed.component.name)
  }
  const children = node.children ?? []
  if (node.type === 'list' || node.type === 'listItem' || node.type === 'blockquote') {
    return children.map((child) => canonicalNodeText(child, source)).join('\n')
  }
  if (node.type === 'table')
    return children.map((child) => canonicalNodeText(child, source)).join('\n')
  if (node.type === 'tableRow')
    return children.map((child) => canonicalNodeText(child, source)).join('\t')
  if (typeof node.value === 'string') return node.value.normalize('NFC')
  return children.map((child) => canonicalNodeText(child, source)).join('')
}

function canonicalBlockText(
  nodes: readonly MarkdownNode[],
  source: string,
): string {
  const values: string[] = []
  for (let index = 0; index < nodes.length; index += 1) {
    let node = nodes[index]!
    if (node.type === 'yaml' || node.type === 'definition') continue
    const combined = combinePairedComponent(node, source)
    if (combined) {
      node = combined
      while (
        index + 1 < nodes.length &&
        (nodes[index + 1]!.position?.start.offset ?? Number.POSITIVE_INFINITY) <
          combined.position!.end.offset!
      ) {
        index += 1
      }
    }
    values.push(canonicalNodeText(node, source))
  }
  return values.join('\n')
}

function atomicSegment(node: MarkdownNode, nodeId: string, value: string, context: CompileContext): SourceMapSegment {
  const range = rangeOf(node, context.input.source)
  const raw = sliceRange(context.input.source, range)
  const relative = value ? raw.indexOf(value) : -1
  return { nodeId, canonicalStart: 0, canonicalEnd: value.length, sourceStart: relative >= 0 ? range.start.offset + relative : range.start.offset, sourceEnd: relative >= 0 ? range.start.offset + relative + value.length : range.end.offset, kind: 'atomic' }
}

function textSegments(node: MarkdownNode, nodeId: string, originalValue: string, context: CompileContext): SourceMapSegment[] {
  const range = rangeOf(node, context.input.source)
  const raw = sliceRange(context.input.source, range)
  const tokens = tokenizeSourceText(raw)
  const aligned = alignSourceTokens(tokens, originalValue)
  const canonicalValue = originalValue.normalize('NFC')
  if (!aligned) {
    return [{ nodeId, canonicalStart: 0, canonicalEnd: canonicalValue.length, sourceStart: range.start.offset, sourceEnd: range.end.offset, kind: 'text' }]
  }
  const segments: SourceMapSegment[] = []
  const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  let canonicalCursor = 0
  for (const grapheme of graphemes.segment(originalValue)) {
    const originalEnd = grapheme.index + grapheme.segment.length
    const members = aligned.filter(
      (primitive) =>
        primitive.originalStart < originalEnd &&
        primitive.originalEnd > grapheme.index,
    )
    const canonicalCluster = grapheme.segment.normalize('NFC')
    segments.push({
      nodeId,
      canonicalStart: canonicalCursor,
      canonicalEnd: canonicalCursor + canonicalCluster.length,
      sourceStart:
        range.start.offset + (members[0]?.sourceStart ?? 0),
      sourceEnd:
        range.start.offset + (members.at(-1)?.sourceEnd ?? raw.length),
      kind: canonicalCluster === '\n' ? 'soft-break' : 'text',
    })
    canonicalCursor += canonicalCluster.length
  }
  return segments
}

type SourceToken = {
  sourceStart: number
  sourceEnd: number
  decoded?: string
}

type AlignedSourceToken = SourceToken & {
  originalStart: number
  originalEnd: number
}

function tokenizeSourceText(raw: string): SourceToken[] {
  const tokens: SourceToken[] = []
  let cursor = 0
  while (cursor < raw.length) {
    if (raw[cursor] === '&') {
      const reference = raw
        .slice(cursor)
        .match(
          /^&(?:#[xX][\dA-Fa-f]{1,6}|#\d{1,7}|[A-Za-z][A-Za-z\d]{1,31});/,
        )?.[0]
      if (reference) {
        const decoded = decodeCharacterReference(reference)
        if (decoded !== reference) {
          tokens.push({
            sourceStart: cursor,
            sourceEnd: cursor + reference.length,
            decoded,
          })
          cursor += reference.length
          continue
        }
      }
    }
    if (
      raw[cursor] === '\\' &&
      cursor + 1 < raw.length &&
      isAsciiPunctuation(raw[cursor + 1]!)
    ) {
      const length = raw.codePointAt(cursor + 1)! > 0xffff ? 2 : 1
      tokens.push({
        sourceStart: cursor,
        sourceEnd: cursor + 1 + length,
        decoded: raw.slice(cursor + 1, cursor + 1 + length),
      })
      cursor += 1 + length
      continue
    }
    const length = raw.codePointAt(cursor)! > 0xffff ? 2 : 1
    tokens.push({
      sourceStart: cursor,
      sourceEnd: cursor + length,
      decoded: raw.slice(cursor, cursor + length),
    })
    cursor += length
  }
  return tokens
}

function isAsciiPunctuation(value: string): boolean {
  return /^[!-/:-@[-`{-~]$/.test(value)
}

function decodeCharacterReference(reference: string): string {
  const ast = parseDocument(reference)
  const paragraph = ast.children?.[0]
  const text = paragraph?.children?.[0]
  return typeof text?.value === 'string' ? text.value : reference
}

function alignSourceTokens(
  tokens: readonly SourceToken[],
  originalValue: string,
): AlignedSourceToken[] | undefined {
  const memo = new Map<string, AlignedSourceToken[] | null>()
  const search = (
    tokenIndex: number,
    originalIndex: number,
  ): AlignedSourceToken[] | undefined => {
    const key = `${tokenIndex}:${originalIndex}`
    const cached = memo.get(key)
    if (cached !== undefined) return cached ?? undefined
    if (tokenIndex === tokens.length) {
      const result = originalIndex === originalValue.length ? [] : undefined
      memo.set(key, result ?? null)
      return result
    }
    const token = tokens[tokenIndex]!
    if (token.decoded !== undefined) {
      if (!originalValue.startsWith(token.decoded, originalIndex)) return undefined
      const rest = search(tokenIndex + 1, originalIndex + token.decoded.length)
      const result = rest
        ? [
            {
              ...token,
              originalStart: originalIndex,
              originalEnd: originalIndex + token.decoded.length,
            },
            ...rest,
          ]
        : undefined
      memo.set(key, result ?? null)
      return result
    }
    for (
      let end = nextCodePointBoundary(originalValue, originalIndex);
      end <= originalValue.length;
      end = nextCodePointBoundary(originalValue, end)
    ) {
      const rest = search(tokenIndex + 1, end)
      if (rest) {
        const result = [
          { ...token, originalStart: originalIndex, originalEnd: end },
          ...rest,
        ]
        memo.set(key, result)
        return result
      }
      if (end === originalValue.length) break
    }
    memo.set(key, null)
    return undefined
  }
  return search(0, 0)
}

function nextCodePointBoundary(value: string, index: number): number {
  if (index >= value.length) return value.length + 1
  return index + (value.codePointAt(index)! > 0xffff ? 2 : 1)
}

function shiftSegments(segments: readonly SourceMapSegment[], offset: number): SourceMapSegment[] { return segments.map((segment) => ({ ...segment, canonicalStart: segment.canonicalStart + offset, canonicalEnd: segment.canonicalEnd + offset })) }
function collectChildSegments(children: readonly { blockId: string }[], context: CompileContext): SourceMapSegment[] { const result: SourceMapSegment[] = []; let offset = 0; for (const child of children) { const segments = context.sourceMap[child.blockId] ?? []; result.push(...shiftSegments(segments, offset)); const length = segments.reduce((max, segment) => Math.max(max, segment.canonicalEnd), 0); offset += length + 1 } return result }

function findImageDimensions(manifest: readonly unknown[], articleSlug: string, src: string): { width?: number; height?: number } {
  const suffix = src.replace(/^\.\//, '').replace(/\\/g, '/')
  const expectedOutputPath = `blog/${articleSlug}/${suffix}`
  for (const item of manifest) {
    if (!item || typeof item !== 'object') continue
    const entry = item as { articleSlug?: unknown; outputPath?: unknown; image?: { width?: unknown; height?: unknown; derived?: unknown } }
    if (entry.articleSlug === articleSlug && entry.outputPath === expectedOutputPath && entry.image?.derived === false && typeof entry.image.width === 'number' && typeof entry.image.height === 'number') return { width: entry.image.width, height: entry.image.height }
  }
  return {}
}

function collectDefinitions(root: MarkdownNode): ReadonlyMap<string, MarkdownNode> {
  const definitions = new Map<string, MarkdownNode>()
  const visit = (node: MarkdownNode) => {
    if (node.type === 'definition' && typeof node.identifier === 'string') {
      const identifier = node.identifier.toLowerCase()
      if (!definitions.has(identifier)) definitions.set(identifier, node)
    }
    for (const child of node.children ?? []) visit(child)
  }
  visit(root)
  return definitions
}
