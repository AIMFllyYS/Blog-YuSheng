import 'server-only'

import {
  bundledLanguages,
  codeToTokens,
  type BundledLanguage,
} from 'shiki'
import type { ThemeRegistrationRaw } from 'shiki/types'

export type HighlightedCodeToken = {
  readonly content: string
  readonly color: string
  readonly fontStyle: number
}

export type HighlightedCode = {
  readonly language: string
  readonly knownLanguage: boolean
  readonly lines: readonly (readonly HighlightedCodeToken[])[]
}

const BLOG_TOKEN_THEME: ThemeRegistrationRaw = {
  name: 'blog-token-theme',
  type: 'light',
  fg: 'var(--ink)',
  bg: 'transparent',
  settings: [
    { settings: { foreground: 'var(--ink)' } },
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: 'var(--ink-faint)', fontStyle: 'italic' },
    },
    {
      scope: [
        'keyword',
        'storage',
        'entity.name.tag',
        'punctuation.definition.tag',
      ],
      settings: { foreground: 'var(--accent)' },
    },
    {
      scope: [
        'string',
        'constant.numeric',
        'constant.language',
        'variable.other.constant',
      ],
      settings: { foreground: 'var(--ink-muted)' },
    },
    {
      scope: ['entity.name.function', 'support.function', 'support.class'],
      settings: { foreground: 'var(--accent)' },
    },
  ],
}

export async function highlightCode(
  source: string,
  requestedLanguage?: string,
): Promise<HighlightedCode> {
  const language = normalizeLanguage(requestedLanguage)
  const knownLanguage = isBundledLanguage(language)
  const result = await codeToTokens(source, {
    lang: knownLanguage ? (language as BundledLanguage) : 'text',
    theme: BLOG_TOKEN_THEME,
  })
  return Object.freeze({
    language: requestedLanguage?.trim() || 'text',
    knownLanguage,
    lines: Object.freeze(
      result.tokens.map((line) =>
        Object.freeze(
          line.map((token) =>
            Object.freeze({
              content: token.content,
              color: token.color ?? 'var(--ink)',
              fontStyle: token.fontStyle ?? 0,
            }),
          ),
        ),
      ),
    ),
  })
}

function normalizeLanguage(value?: string): string {
  const normalized = value?.trim().toLowerCase()
  return normalized || 'text'
}

function isBundledLanguage(value: string): boolean {
  return Object.hasOwn(bundledLanguages, value)
}
