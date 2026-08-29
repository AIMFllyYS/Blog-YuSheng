import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const grayScaffold = /gray-(600|800|900)/

describe('fault pages use paper tokens instead of gray scaffold', () => {
  it.each([
    'src/app/not-found.tsx',
    'src/app/error.tsx',
    'src/app/global-error.tsx',
  ])('%s has no gray-600/800/900 classes', (path) => {
    const source = readFileSync(path, 'utf8')
    expect(source).not.toMatch(grayScaffold)
    expect(source).toContain('var(--bg)')
    expect(source).toContain('var(--accent)')
  })
})
