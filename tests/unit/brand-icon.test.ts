import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'

describe('brand tab icon', () => {
  it('keeps a square SVG seal with the 羽 mark and journey colors', () => {
    const svg = readFileSync('src/app/icon.svg', 'utf8')
    expect(svg).toContain('viewBox="0 0 32 32"')
    expect(svg).toContain('aria-label="羽升"')
    expect(svg).toContain('#271b10')
    expect(svg).toContain('#d6b664')
    expect(svg).toContain('#f3e6c5')
    expect(svg).not.toMatch(/<script/i)
    expect(svg).not.toMatch(/url\(/i)
  })

  it('ships raster fallbacks at the sizes browsers actually request', async () => {
    const png = await sharp('src/app/icon.png').metadata()
    const apple = await sharp('src/app/apple-icon.png').metadata()
    const ico = readFileSync('src/app/favicon.ico')

    expect(png.format).toBe('png')
    expect(png.width).toBe(32)
    expect(png.height).toBe(32)
    expect(apple.format).toBe('png')
    expect(apple.width).toBe(180)
    expect(apple.height).toBe(180)
    expect(ico.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0]))).toBe(true)
    expect(ico.readUInt16LE(4)).toBe(2)
  })
})
