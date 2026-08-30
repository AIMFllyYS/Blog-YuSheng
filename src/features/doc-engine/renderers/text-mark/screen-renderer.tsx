import type { CSSProperties, ReactNode } from 'react'

import type { RegisteredComponentNode } from '../../core'
import {
  cssVarsForMark,
  resolveMarkStyle,
  type ArticlePalette,
} from '../../mark-style'
import effects from '../../mark-style/effects.module.css'

export function TextMarkScreenRenderer({
  children,
  node,
  palette,
}: {
  readonly children: ReactNode
  readonly node: RegisteredComponentNode
  readonly palette?: ArticlePalette
}) {
  const style = resolveMarkStyle(node.attributes, palette)
  if (!style.ok) {
    return <span data-text-mark="invalid">{children}</span>
  }
  const vars = cssVarsForMark(style) as CSSProperties
  return (
    <mark
      className={effects.mark}
      data-effect={style.effect}
      data-text-mark=""
      data-tone={style.tone}
      style={vars}
    >
      {children}
    </mark>
  )
}
