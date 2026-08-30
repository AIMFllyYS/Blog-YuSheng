export const DOCUMENT_SCHEMA_VERSION = 1 as const
export const DOCUMENT_PROTOCOL_VERSION = 'document-ir-v1' as const

export type SourcePoint = {
  readonly line: number
  readonly column: number
  /** UTF-16 code unit offset, matching browser Range offsets. */
  readonly offset: number
}

export type SourceRange = {
  readonly start: SourcePoint
  readonly end: SourcePoint
}

export type DocumentNodeType =
  | 'root'
  | 'heading'
  | 'paragraph'
  | 'text'
  | 'emphasis'
  | 'strong'
  | 'delete'
  | 'link'
  | 'list'
  | 'listItem'
  | 'quote'
  | 'table'
  | 'tableRow'
  | 'tableCell'
  | 'inlineCode'
  | 'code'
  | 'math'
  | 'mermaid'
  | 'image'
  | 'registeredComponent'
  | 'footnoteReference'
  | 'footnoteDefinition'
  | 'thematicBreak'

export type SourceMapSegment = {
  readonly nodeId: string
  readonly canonicalStart: number
  readonly canonicalEnd: number
  readonly sourceStart: number
  readonly sourceEnd: number
  readonly kind: 'text' | 'soft-break' | 'atomic'
}

export type DocumentNodeBase<TType extends DocumentNodeType> = {
  readonly nodeId: string
  readonly type: TType
  readonly sourceRange: SourceRange
  readonly sourceText?: string
  readonly canonicalText?: string
}

export type SemanticBlockBase<TType extends DocumentNodeType> =
  DocumentNodeBase<TType> & {
    readonly blockId: string
    readonly canonicalText: string
  }

export type RootNode = DocumentNodeBase<'root'> & {
  readonly children: readonly BlockNode[]
}

export type HeadingNode = SemanticBlockBase<'heading'> & {
  readonly depth: 1 | 2 | 3 | 4 | 5 | 6
  readonly slug: string
  readonly children: readonly InlineNode[]
}

export type ParagraphNode = SemanticBlockBase<'paragraph'> & {
  readonly children: readonly InlineNode[]
}

export type TextNode = DocumentNodeBase<'text'> & {
  readonly value: string
  readonly canonicalText: string
}

export type EmphasisNode = DocumentNodeBase<'emphasis'> & {
  readonly children: readonly InlineNode[]
}

export type StrongNode = DocumentNodeBase<'strong'> & {
  readonly children: readonly InlineNode[]
}

export type DeleteNode = DocumentNodeBase<'delete'> & {
  readonly children: readonly InlineNode[]
}

export type LinkNode = DocumentNodeBase<'link'> & {
  readonly url: string
  readonly title?: string
  readonly children: readonly InlineNode[]
}

export type InlineCodeNode = DocumentNodeBase<'inlineCode'> & {
  readonly value: string
  readonly canonicalText: string
}

export type FootnoteReferenceNode = DocumentNodeBase<'footnoteReference'> & {
  readonly identifier: string
  readonly canonicalText: string
}

export type ListNode = SemanticBlockBase<'list'> & {
  readonly ordered: boolean
  readonly start?: number
  readonly children: readonly ListItemNode[]
}

export type ListItemNode = SemanticBlockBase<'listItem'> & {
  readonly checked?: boolean
  readonly children: readonly BlockNode[]
}

export type QuoteNode = SemanticBlockBase<'quote'> & {
  readonly children: readonly BlockNode[]
}

export type TableNode = SemanticBlockBase<'table'> & {
  readonly align: readonly ('left' | 'center' | 'right' | null)[]
  readonly children: readonly TableRowNode[]
}

export type TableRowNode = DocumentNodeBase<'tableRow'> & {
  readonly children: readonly TableCellNode[]
}

export type TableCellNode = SemanticBlockBase<'tableCell'> & {
  readonly header?: boolean
  readonly children: readonly InlineNode[]
}

export type CodeNode = SemanticBlockBase<'code'> & {
  readonly language?: string
  readonly meta?: string
  readonly value: string
  readonly canonicalText: string
}

export type InlineMathNode = DocumentNodeBase<'math'> & {
  readonly display: false
  readonly value: string
  readonly canonicalText: string
}

export type DisplayMathNode = SemanticBlockBase<'math'> & {
  readonly display: true
  readonly value: string
}

export type MermaidNode = SemanticBlockBase<'mermaid'> & {
  readonly value: string
  readonly canonicalText: string
}

type ImageFields = {
  readonly src: string
  readonly srcSourceRange?: SourceRange
  readonly alt: string
  readonly title?: string
  readonly width?: number
  readonly height?: number
}

export type InlineImageNode = DocumentNodeBase<'image'> &
  ImageFields & {
    readonly placement: 'inline'
  }

export type BlockImageNode = SemanticBlockBase<'image'> &
  ImageFields & {
    readonly placement: 'block'
  }

type RegisteredComponentFields = {
  readonly name: string
  readonly componentId: string
  readonly attributes: Readonly<Record<string, unknown>>
  readonly attributeSourceRanges?: Readonly<Record<string, SourceRange>>
  readonly selectable: 'text-range' | 'whole-node' | 'none'
}

export type InlineRegisteredComponentNode = DocumentNodeBase<'registeredComponent'> &
  RegisteredComponentFields & {
    readonly placement: 'inline'
    readonly blockId?: string
    readonly children: readonly InlineNode[]
    readonly canonicalText: string
  }

export type BlockRegisteredComponentNode = SemanticBlockBase<'registeredComponent'> &
  RegisteredComponentFields & {
    readonly placement: 'block'
    readonly children: readonly BlockNode[]
  }

export type RegisteredComponentNode =
  | InlineRegisteredComponentNode
  | BlockRegisteredComponentNode

export type FootnoteDefinitionNode = SemanticBlockBase<'footnoteDefinition'> & {
  readonly identifier: string
  readonly children: readonly BlockNode[]
}

export type ThematicBreakNode = SemanticBlockBase<'thematicBreak'>

export type InlineNode =
  | TextNode
  | EmphasisNode
  | StrongNode
  | DeleteNode
  | LinkNode
  | InlineCodeNode
  | InlineMathNode
  | InlineImageNode
  | FootnoteReferenceNode
  | InlineRegisteredComponentNode

export type BlockNode =
  | HeadingNode
  | ParagraphNode
  | ListNode
  | QuoteNode
  | TableNode
  | CodeNode
  | DisplayMathNode
  | MermaidNode
  | BlockImageNode
  | BlockRegisteredComponentNode
  | FootnoteDefinitionNode
  | ThematicBreakNode

export type DocumentNode =
  | RootNode
  | BlockNode
  | InlineNode
  | ListItemNode
  | TableRowNode
  | TableCellNode

export type CompiledDocument = {
  readonly schemaVersion: typeof DOCUMENT_SCHEMA_VERSION
  readonly protocolVersion: typeof DOCUMENT_PROTOCOL_VERSION
  readonly articleSlug: string
  readonly documentFingerprint: string
  readonly frontmatter: unknown
  readonly root: RootNode
  /** Complete validated index.md source, including frontmatter. */
  readonly originalSource: string
  readonly assetManifest: readonly unknown[]
  readonly sourceMap: Readonly<Record<string, readonly SourceMapSegment[]>>
}
