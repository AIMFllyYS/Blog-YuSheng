import type { CSSProperties, ReactNode } from 'react'

import type { RegisteredComponentNode } from '../../core'
import {
  cssVarsForMark,
  resolveMarkStyle,
  type ArticlePalette,
} from '../../mark-style'
import styles from './aside-note.module.css'

export function AsideNoteScreenRenderer({
  children,
  node,
  palette,
}: {
  readonly children: ReactNode
  readonly node: Extract<RegisteredComponentNode, { placement: 'block' }>
  readonly palette?: ArticlePalette
}) {
  const kind = String(node.attributes.kind ?? 'callout')
  const title = typeof node.attributes.title === 'string' ? node.attributes.title : undefined
  const tint =
    node.attributes.swatch || node.attributes.tone
      ? resolveMarkStyle(
          {
            ...(typeof node.attributes.swatch === 'string'
              ? { swatch: node.attributes.swatch }
              : { tone: node.attributes.tone }),
          },
          palette,
        )
      : undefined
  const vars = tint?.ok ? (cssVarsForMark(tint) as CSSProperties) : undefined
  return (
    <aside
      className={styles.note}
      data-aside-note={kind}
      data-block-id={node.blockId}
      data-kind={kind}
      data-selectable="text-range"
      style={vars}
    >
      {title ? <p className={styles.title}>{title}</p> : null}
      <div className={styles.body}>{children}</div>
    </aside>
  )
}
