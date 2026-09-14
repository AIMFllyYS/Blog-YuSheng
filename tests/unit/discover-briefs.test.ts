import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  BriefBuildError,
  copyBriefs,
  discoverBriefs,
  listBriefs,
  parseBriefSource,
} from '../../src/server/briefs'

const REAL_ROOT = path.join(process.cwd(), 'content', 'briefs')
const temporaryRoots: string[] = []

async function createRoot() {
  const root = await mkdtemp(path.join(tmpdir(), 'briefs-'))
  temporaryRoots.push(root)
  return root
}

async function writeBrief(root: string, relative: string, title = '折晓早报 · 试刊 · 2026-01-01') {
  const target = path.join(root, relative)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, `<!DOCTYPE html><html><head><title>${title}</title></head><body>hi</body></html>`)
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('parseBriefSource', () => {
  it('prefers the DESIGN LESSON block and strips 《》', () => {
    const meta = parseBriefSource(
      `<title>折晓早报 · 注资轨 · 2026-09-14</title>
<!--
DESIGN LESSON 2026-09-14 折晓早报
STYLE: 剪纸/折纸 layered kraft
GENRE: 手风琴折页 zine
TITLE: 《注资轨》 (Funding Track)
THESIS: 口头缓行，轨道上仍在加注
-->`,
      '2026-09-14',
    )
    expect(meta).toEqual({
      title: '折晓早报 · 注资轨 · 2026-09-14',
      headline: '注资轨',
      style: '剪纸/折纸 layered kraft',
      genre: '手风琴折页 zine',
      thesis: '口头缓行，轨道上仍在加注',
    })
  })

  it.each([
    ['折晓早报 · 注资轨 · 2026-09-14', '注资轨'],
    ['限速中 · Med-YuSheng 早报 · 2026-08-19', '限速中'],
    ['折晓 · 值班 · TODAY / 0821', '值班'],
    ['《异心关》LEVEL 09-08 · 折晓早报', '异心关'],
    ['折晓 · 2026-08-27 · 今日印次', '今日印次'],
    ['折晓晚刊 · SAT 8.22 · VOL.34', '折晓晚刊'],
  ])('derives a headline from %s', (title, headline) => {
    expect(parseBriefSource(`<title>${title}</title>`, '2026-09-14').headline).toBe(headline)
  })

  it('falls back to a dated brand title when <title> is missing', () => {
    expect(parseBriefSource('<html></html>', '2026-09-14').title).toBe('折晓早报 · 2026-09-14')
  })
})

describe('discoverBriefs', () => {
  it('reads flat and month-nested files, newest first, with route and public urls', async () => {
    const root = await createRoot()
    await writeBrief(root, '2026-09/ai-brief-2026-09-14.html', '折晓早报 · 注资轨 · 2026-09-14')
    await writeBrief(root, 'ai-brief-2026-09-13.html', '折晓早报 · 对拍 · 2026-09-13')
    await writeBrief(root, '2026-08/notes.txt')

    const briefs = await listBriefs(root)
    expect(briefs.map((brief) => brief.date)).toEqual(['2026-09-14', '2026-09-13'])
    expect(briefs[0]).toMatchObject({
      headline: '注资轨',
      weekday: 1,
      isoWeek: 38,
      publicUrl: '/briefs/2026-09-14.html',
      href: '/daily/2026-09-14/',
    })
    expect(briefs[0]!.bytes).toBeGreaterThan(0)
  })

  it('returns an empty list when the content directory does not exist', async () => {
    const root = path.join(await createRoot(), 'missing')
    expect(await listBriefs(root)).toEqual([])
  })

  it('fails the build on duplicate or malformed dates', async () => {
    const root = await createRoot()
    await writeBrief(root, '2026-09/ai-brief-2026-09-14.html')
    await writeBrief(root, 'ai-brief-2026-09-14.html')
    await writeBrief(root, 'ai-brief-2026-02-30.html')
    await writeBrief(root, 'random.html')

    const failure = await discoverBriefs(root).catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(BriefBuildError)
    const codes = (failure as BriefBuildError).diagnostics.map((item) => item.code)
    expect(codes).toContain('BRIEF_DATE_DUPLICATE')
    expect(codes.filter((code) => code === 'BRIEF_DATE_INVALID')).toHaveLength(2)
  })

  it('copies discovered briefs to <out>/briefs/<date>.html', async () => {
    const root = await createRoot()
    const out = await createRoot()
    await writeBrief(root, '2026-09/ai-brief-2026-09-14.html')
    await copyBriefs(await discoverBriefs(root), out)
    expect(await readFile(path.join(out, 'briefs', '2026-09-14.html'), 'utf8')).toContain('<title>')
  })

  it('discovers the seeded repository briefs', async () => {
    const briefs = await listBriefs(REAL_ROOT)
    expect(briefs.length).toBeGreaterThanOrEqual(28)
    expect(briefs.some((brief) => brief.date === '2026-09-14')).toBe(true)
  })
})
