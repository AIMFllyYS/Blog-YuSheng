import {
  getComponentSchema,
  isPairedRegisteredName,
  isRegisteredComponentName,
} from './component-syntax'

const OPEN_TAG = /^<([a-z][a-z\d-]*)\b/

export function findMatchingClose(
  source: string,
  name: string,
  afterOpen: number,
): { index: number; length: number } | undefined {
  const openPattern = new RegExp(`<${escapeRegExp(name)}\\b`, 'g')
  const closePattern = new RegExp(`<\\/${escapeRegExp(name)}\\s*>`, 'g')
  let depth = 1
  let cursor = afterOpen
  while (cursor < source.length) {
    const skipped = skipCodeRegion(source, cursor)
    if (skipped !== cursor) {
      cursor = skipped
      continue
    }
    openPattern.lastIndex = cursor
    closePattern.lastIndex = cursor
    const open = openPattern.exec(source)
    const close = closePattern.exec(source)
    if (!close) return undefined
    if (open && open.index < close.index) {
      depth += 1
      cursor = open.index + open[0].length
      continue
    }
    depth -= 1
    if (depth === 0) {
      return { index: close.index, length: close[0].length }
    }
    cursor = close.index + close[0].length
  }
  return undefined
}

export function openingTagName(raw: string): string | undefined {
  const match = OPEN_TAG.exec(raw.trim())
  return match?.[1]
}

export function isCompletePairedTag(raw: string, name: string): boolean {
  return new RegExp(`<\\/${escapeRegExp(name)}\\s*>\\s*$`).test(raw)
}

export function isClosingTag(raw: string, name: string): boolean {
  return new RegExp(`^<\\/${escapeRegExp(name)}\\s*>\\s*$`).test(raw.trim())
}

export function shouldCombinePairedHtml(raw: string): string | undefined {
  const name = openingTagName(raw)
  if (!name || !isPairedRegisteredName(name)) return undefined
  const schema = getComponentSchema(name)
  if (schema?.placement === 'inline') return undefined
  if (isCompletePairedTag(raw, name)) return undefined
  return name
}

export function componentPlacementOf(name: string) {
  return getComponentSchema(name)?.placement
}

export type SourceSlice =
  | {
      readonly kind: 'tag'
      readonly name: string
      readonly raw: string
      readonly start: number
      readonly end: number
    }
  | {
      readonly kind: 'markdown'
      readonly text: string
      readonly start: number
      readonly end: number
    }

export function splitTopLevelPairedTags(
  source: string,
  absoluteStart: number,
): readonly SourceSlice[] {
  const slices: SourceSlice[] = []
  let cursor = 0
  while (cursor < source.length) {
    const next = nextPairedOpen(source, cursor)
    if (!next) {
      if (cursor < source.length) {
        slices.push({
          kind: 'markdown',
          text: source.slice(cursor),
          start: absoluteStart + cursor,
          end: absoluteStart + source.length,
        })
      }
      break
    }
    if (next.index > cursor) {
      slices.push({
        kind: 'markdown',
        text: source.slice(cursor, next.index),
        start: absoluteStart + cursor,
        end: absoluteStart + next.index,
      })
    }
    const afterOpen = next.index + next.length
    const close = findMatchingClose(source, next.name, afterOpen)
    if (!close) {
      slices.push({
        kind: 'tag',
        name: next.name,
        raw: source.slice(next.index),
        start: absoluteStart + next.index,
        end: absoluteStart + source.length,
      })
      break
    }
    const end = close.index + close.length
    slices.push({
      kind: 'tag',
      name: next.name,
      raw: source.slice(next.index, end),
      start: absoluteStart + next.index,
      end: absoluteStart + end,
    })
    cursor = end
  }
  return slices
}

function nextPairedOpen(
  source: string,
  from: number,
): { index: number; length: number; name: string } | undefined {
  const pattern = /<([a-z][a-z\d-]*)\b/g
  pattern.lastIndex = from
  let match = pattern.exec(source)
  while (match) {
    const index = match.index
    const skipped = skipCodeRegion(source, index)
    if (skipped !== index) {
      pattern.lastIndex = Math.max(skipped, index + 1)
      match = pattern.exec(source)
      continue
    }
    const name = match[1]
    if (name && isPairedRegisteredName(name)) {
      return { index, length: match[0].length, name }
    }
    match = pattern.exec(source)
  }
  return undefined
}

export function isInlineRegisteredTag(name: string): boolean {
  return (
    isRegisteredComponentName(name) &&
    getComponentSchema(name)?.placement === 'inline'
  )
}

function skipCodeRegion(source: string, cursor: number): number {
  if (source.startsWith('```', cursor) || source.startsWith('~~~', cursor)) {
    const fence = source.slice(cursor, cursor + 3)
    const close = source.indexOf(`\n${fence}`, cursor + 3)
    return close < 0 ? source.length : close + 4
  }
  if (source[cursor] === '`') {
    let ticks = 0
    while (source[cursor + ticks] === '`') ticks += 1
    const close = source.indexOf('`'.repeat(ticks), cursor + ticks)
    return close < 0 ? source.length : close + ticks
  }
  return cursor
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
