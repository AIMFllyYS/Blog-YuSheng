import type { ReactNode } from 'react'

import type { BlockNode, RegisteredComponentNode } from '../../core'
import styles from './compare-block.module.css'

export function CompareBlockScreenRenderer({
  children,
  node,
}: {
  readonly children: ReactNode
  readonly node: Extract<RegisteredComponentNode, { placement: 'block' }>
}) {
  return (
    <div
      className={styles.grid}
      data-block-id={node.blockId}
      data-compare-block=""
      data-selectable="text-range"
    >
      {children}
    </div>
  )
}

export function CompareSideScreenRenderer({
  children,
  node,
}: {
  readonly children: ReactNode
  readonly node: Extract<RegisteredComponentNode, { placement: 'block' }>
}) {
  const role = String(node.attributes.role ?? 'a')
  const title = typeof node.attributes.title === 'string' ? node.attributes.title : undefined
  const label =
    role === 'bad' ? '反例' : role === 'good' ? '正例' : role.toUpperCase()
  return (
    <article
      className={styles.side}
      data-block-id={node.blockId}
      data-compare-side={role}
      data-role={role}
    >
      <p className={styles.kicker}>{label}</p>
      {title ? <h4 className={styles.title}>{title}</h4> : null}
      <div className={styles.body}>{children}</div>
    </article>
  )
}

export function isCompareSide(
  node: BlockNode,
): node is Extract<RegisteredComponentNode, { placement: 'block' }> {
  return node.type === 'registeredComponent' && node.name === 'compare-side'
}
