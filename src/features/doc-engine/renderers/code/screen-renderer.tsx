import 'server-only'

import type { CSSProperties } from 'react'

import type { CodeNode } from '../../core'
import { CopyCodeButton } from './copy-code-button'
import { highlightCode } from './highlight-code.server'

export async function CodeScreenRenderer({ node }: { readonly node: CodeNode }) {
  const highlighted = await highlightCode(node.value, node.language)
  return (
    <figure
      className="relative my-6 overflow-hidden rounded-md border border-[var(--line)] bg-[var(--bg-elevated)] text-[var(--ink)] shadow-[0_8px_22px_var(--shadow-color)]"
      data-block-id={node.blockId}
      data-code-language-known={highlighted.knownLanguage ? 'true' : 'false'}
      data-code-renderer="shiki-server"
      data-language={highlighted.language}
    >
      <figcaption className="absolute right-2 top-2 z-10 flex items-center gap-2">
        <span className="rounded-sm border border-[var(--line)] bg-[var(--bg)] px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
          {highlighted.language}
        </span>
        <CopyCodeButton source={node.value} />
      </figcaption>
      <pre
        className="max-w-full overflow-x-auto px-4 pb-4 pt-14 text-sm leading-6 [font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation_Mono','Courier_New',monospace] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]"
        tabIndex={0}
      >
        <code>
          {highlighted.lines.map((line, lineIndex) => (
            <span className="block min-w-max" data-code-line={lineIndex + 1} key={lineIndex}>
              {line.length === 0 ? (
                <span aria-hidden="true" className="inline-block h-[1em] w-0" />
              ) : line.map((token, tokenIndex) => (
                <span
                  data-code-token="true"
                  key={`${lineIndex}-${tokenIndex}`}
                  style={tokenStyle(token.color, token.fontStyle)}
                >
                  {token.content}
                </span>
              ))}
              {lineIndex < highlighted.lines.length - 1 ? '\n' : null}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  )
}

function tokenStyle(color: string, fontStyle: number): CSSProperties {
  return {
    color,
    fontStyle: fontStyle & 1 ? 'italic' : undefined,
    fontWeight: fontStyle & 2 ? 700 : undefined,
    textDecoration: fontStyle & 4 ? 'underline' : undefined,
  }
}
