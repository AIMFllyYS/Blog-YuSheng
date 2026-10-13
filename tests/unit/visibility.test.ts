import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { listBriefs, listPublicBriefs } from '../../src/server/briefs'
import {
  readVisibility,
  VisibilityFileError,
} from '../../src/server/visibility/read-visibility'
import {
  parseVisibilitySource,
  serializeVisibility,
} from '../../src/server/visibility/visibility-json.mjs'

const REAL_BRIEFS = path.join(process.cwd(), 'content', 'briefs')
const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  )
})

describe('visibility file', () => {
  it('reads the repository list', async () => {
    const visibility = await readVisibility()
    expect(Array.isArray(visibility.posts)).toBe(true)
    expect(Array.isArray(visibility.briefs)).toBe(true)
  })

  it('rejects a malformed list before it can publish everything by accident', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'visibility-'))
    temporaryRoots.push(root)
    const filePath = path.join(root, 'visibility.json')
    await writeFile(filePath, '{ "posts": ["../secret"], "briefs": [] }', 'utf8')
    await expect(readVisibility(filePath)).rejects.toBeInstanceOf(VisibilityFileError)
  })

  it('round-trips a sorted list', () => {
    const parsed = parseVisibilitySource(
      serializeVisibility({ posts: ['b-post', 'a-post'], briefs: ['2026-10-02', '2026-10-01'] }),
    )
    expect(parsed).toEqual({
      ok: true,
      value: { posts: ['a-post', 'b-post'], briefs: ['2026-10-01', '2026-10-02'] },
    })
  })

  it('keeps hidden brief originals on disk and out of the public list', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'briefs-visibility-'))
    temporaryRoots.push(root)
    await writeFile(
      path.join(root, 'ai-brief-2026-09-14.html'),
      '<title>折晓早报 · 注资轨 · 2026-09-14</title>',
      'utf8',
    )
    await writeFile(
      path.join(root, 'ai-brief-2026-09-13.html'),
      '<title>折晓早报 · 对拍 · 2026-09-13</title>',
      'utf8',
    )

    expect((await listBriefs(root)).map((brief) => brief.date)).toEqual([
      '2026-09-14',
      '2026-09-13',
    ])
    expect(
      (await listPublicBriefs(root, ['2026-09-14'])).map((brief) => brief.date),
    ).toEqual(['2026-09-13'])
  })

  it('publishes repository briefs except dates listed in visibility.json', async () => {
    const [all, visible, visibility] = await Promise.all([
      listBriefs(REAL_BRIEFS),
      listPublicBriefs(REAL_BRIEFS),
      readVisibility(),
    ])
    const hidden = new Set(visibility.briefs)
    expect(visible.map((brief) => brief.date)).toEqual(
      all.filter((brief) => !hidden.has(brief.date)).map((brief) => brief.date),
    )
  })
})
