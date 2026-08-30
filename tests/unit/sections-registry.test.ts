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
  it('lists the live 大方向 in registry order', async () => {
    const sections = await listSections()
    expect(
      sections.map(({ slug, title, order, summary, color }) => ({
        slug,
        title,
        order,
        summary,
        color,
      })),
    ).toEqual([
      {
        slug: 'fullstack-learning',
        title: '全栈小白学习记',
        order: 10,
        summary: '从零学前端与全栈的笔记：界面、交互、Agent、架构与 Prompt。',
        color: '#5d7a5a',
      },
      {
        slug: 'ai-mflly-notes',
        title: 'AI-MFlly散记',
        order: 20,
        summary: 'AI 创作与工具实践：写代码、生图、写作、视频、音乐，以及这个时代。',
        color: '#2f5d7a',
      },
      {
        slug: 'yu-studies',
        title: '羽の参学',
        order: 25,
        summary:
          '平日与 AI 交谈里沉淀下来的有价值内容：概念汇总、方法论，以及怎么把对话问出东西来。',
        color: '#3a6e78',
      },
      {
        slug: 'yu-reflections',
        title: '羽の思索',
        order: 30,
        summary:
          '主动的思考：事后想通的事、平日里忽然冒出来的念头，以及自己就某一方向写下的看法。',
        color: '#a9762f',
      },
      {
        slug: 'yu-reviews',
        title: '羽の复盘',
        order: 40,
        summary: '按日或按月记下状态和变更。有空就定时写，偏自我观测，不围绕一个论点展开。',
        color: '#9c4a3c',
      },
      {
        slug: 'yu-essays',
        title: '羽の随笔',
        order: 50,
        summary: '不绑主题的短文与观察。',
        color: '#6d5a8a',
      },
      {
        slug: 'other',
        title: '其他',
        order: 60,
        summary: '对不上前面六本、但仍是正式小博客的篇目。',
        color: '#7d7468',
      },
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
      name: 'reserved uncategorized slug',
      source: `sections:\n  - slug: uncategorized\n    title: 散页\n    order: 1\n`,
      code: 'SECTIONS_REGISTRY_RESERVED_SLUG',
    },
    {
      name: 'duplicate order',
      source: `sections:\n  - slug: first\n    title: 一\n    order: 1\n  - slug: second\n    title: 二\n    order: 1\n`,
      code: 'SECTIONS_REGISTRY_DUPLICATE_ORDER',
    },
    {
      name: 'duplicate color ignoring case',
      source: `sections:\n  - slug: first\n    title: 一\n    order: 1\n    color: '#AABBCC'\n  - slug: second\n    title: 二\n    order: 2\n    color: '#aabbcc'\n`,
      code: 'SECTIONS_REGISTRY_DUPLICATE_COLOR',
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
