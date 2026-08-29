import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  assertKnownSections,
  listSections,
} from '../../src/server/content/read-sections'

const temporaryDirs: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirs.splice(0).map((dir) => rm(dir, { recursive: true })),
  )
})

const VALID_REGISTRY = `sections:
  - slug: ai-thinking
    title: AI 时代思考
    order: 20
    summary: 关于 AI 的长文。
  - slug: personal-reflections
    title: 个人感悟
    order: 10
`

describe('sections registry', () => {
  it('lists the four live 大方向 in registry order', async () => {
    const sections = await listSections()
    expect(sections.map((section) => section.slug)).toEqual([
      'personal-reflections',
      'ai-thinking',
      'tech-thinking',
      'medical-thinking',
    ])
  })

  it('returns an empty list when the registry file does not exist', async () => {
    const dir = await createTempDir()
    await expect(
      listSections(path.join(dir, 'sections.yml')),
    ).resolves.toEqual([])
  })

  it('parses, validates and sorts sections by order', async () => {
    const registryPath = await writeRegistry(VALID_REGISTRY)
    const sections = await listSections(registryPath)

    expect(sections.map((section) => section.slug)).toEqual([
      'personal-reflections',
      'ai-thinking',
    ])
    expect(sections[1]).toMatchObject({
      title: 'AI 时代思考',
      summary: '关于 AI 的长文。',
    })
  })

  it('accepts an optional six-digit hex color', async () => {
    const registryPath = await writeRegistry(
      `sections:\n  - slug: ai-thinking\n    title: AI 时代思考\n    order: 20\n    color: '#2f5d7a'\n`,
    )
    const sections = await listSections(registryPath)

    expect(sections[0]?.color).toBe('#2f5d7a')
  })

  it.each([
    {
      name: 'duplicate slug',
      source: `sections:\n  - slug: ai-thinking\n    title: 一\n    order: 1\n  - slug: ai-thinking\n    title: 二\n    order: 2\n`,
      code: 'SECTIONS_REGISTRY_DUPLICATE_SLUG',
    },
    {
      name: 'invalid slug pattern',
      source: `sections:\n  - slug: AI时代\n    title: 一\n    order: 1\n`,
      code: 'SECTIONS_REGISTRY_INVALID',
    },
    {
      name: 'missing required title',
      source: `sections:\n  - slug: ai-thinking\n    order: 1\n`,
      code: 'SECTIONS_REGISTRY_INVALID',
    },
    {
      name: 'unknown field',
      source: `sections:\n  - slug: ai-thinking\n    title: 一\n    order: 1\n    icon: star\n`,
      code: 'SECTIONS_REGISTRY_INVALID',
    },
    {
      name: 'invalid color format',
      source: `sections:\n  - slug: ai-thinking\n    title: 一\n    order: 1\n    color: red\n`,
      code: 'SECTIONS_REGISTRY_INVALID',
    },
    {
      name: 'short hex color',
      source: `sections:\n  - slug: ai-thinking\n    title: 一\n    order: 1\n    color: '#abc'\n`,
      code: 'SECTIONS_REGISTRY_INVALID',
    },
    {
      name: 'broken yaml',
      source: `sections:\n  - slug: ai-thinking\n    title: "未闭合\n`,
      code: 'SECTIONS_REGISTRY_YAML_INVALID',
    },
  ])('rejects $name with a deterministic code', async ({ source, code }) => {
    const registryPath = await writeRegistry(source)
    await expect(listSections(registryPath)).rejects.toMatchObject({
      name: 'ContentBuildError',
      diagnostics: [expect.objectContaining({ code })],
    })
  })

  it('rejects posts that reference an unregistered section', () => {
    expect(() =>
      assertKnownSections(
        [
          { slug: 'known-post', frontmatter: { section: 'ai-thinking' } },
          { slug: 'lost-post', frontmatter: { section: 'nowhere' } },
          { slug: 'loose-post', frontmatter: {} },
        ],
        [
          {
            slug: 'ai-thinking',
            title: 'AI 时代思考',
            order: 20,
          },
        ],
      ),
    ).toThrowError(
      expect.objectContaining({
        name: 'ContentBuildError',
        diagnostics: [
          expect.objectContaining({
            code: 'FRONTMATTER_SECTION_UNKNOWN',
            articleSlug: 'lost-post',
            field: 'section',
          }),
        ],
      }),
    )
  })
})

async function createTempDir() {
  const dir = path.join(
    process.cwd(),
    '.tmp',
    `sections-registry-${crypto.randomUUID()}`,
  )
  temporaryDirs.push(dir)
  await mkdir(dir, { recursive: true })
  return dir
}

async function writeRegistry(source: string) {
  const dir = await createTempDir()
  const registryPath = path.join(dir, 'sections.yml')
  await writeFile(registryPath, source, 'utf8')
  return registryPath
}
