import type { CSSProperties, ReactNode } from 'react'

import type { RegisteredComponentNode } from '../../core'
import {
  cssVarsForMark,
  resolveMarkStyle,
  type ArticlePalette,
} from '../../mark-style'
import styles from './inset-card.module.css'

export function InsetCardScreenRenderer({
  children,
  node,
  palette,
}: {
  readonly children: ReactNode
  readonly node: Extract<RegisteredComponentNode, { placement: 'block' }>
  readonly palette?: ArticlePalette
}) {
  const tint = resolveMarkStyle(
    {
      ...(typeof node.attributes.swatch === 'string'
        ? { swatch: node.attributes.swatch }
        : { tone: typeof node.attributes.tone === 'string' ? node.attributes.tone : 'thesis' }),
    },
    palette,
  )
  const vars = tint.ok ? (cssVarsForMark(tint) as CSSProperties) : undefined
  const title = String(node.attributes.title ?? '')
  const eyebrow =
    typeof node.attributes.eyebrow === 'string' ? node.attributes.eyebrow : undefined
  const kicker =
    typeof node.attributes.kicker === 'string' ? node.attributes.kicker : undefined
  return (
    <article
      className={styles.card}
      data-block-id={node.blockId}
      data-inset-card=""
      data-selectable="text-range"
      style={vars}
    >
      <i className={styles.bar} />
      <div className={styles.body}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h4 className={styles.title}>{title}</h4>
        {kicker ? <p className={styles.kicker}>{kicker}</p> : null}
        <div className={styles.content}>{children}</div>
      </div>
    </article>
  )
}
