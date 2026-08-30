import type { CSSProperties, ReactNode } from 'react'

import type { RegisteredComponentNode } from '../../core'
import {
  cssVarsForMark,
  resolveMarkStyle,
  type ArticlePalette,
} from '../../mark-style'
import styles from './timeline-block.module.css'

export function TimelineBlockScreenRenderer({
  children,
  node,
  palette,
}: {
  readonly children: ReactNode
  readonly node: Extract<RegisteredComponentNode, { placement: 'block' }>
  readonly palette?: ArticlePalette
}) {
  const tint =
    node.attributes.swatch || node.attributes.tone || node.attributes.color
      ? resolveMarkStyle(
          {
            ...(typeof node.attributes.swatch === 'string'
              ? { swatch: node.attributes.swatch }
              : typeof node.attributes.tone === 'string'
                ? { tone: node.attributes.tone }
                : { tone: 'thesis' }),
          },
          palette,
        )
      : undefined
  const vars = tint?.ok ? (cssVarsForMark(tint) as CSSProperties) : undefined
  return (
    <div
      className={styles.timeline}
      data-block-id={node.blockId}
      data-timeline-block=""
      data-selectable="text-range"
      style={vars}
    >
      {children}
    </div>
  )
}
