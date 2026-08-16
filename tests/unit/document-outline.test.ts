import { describe, expect, it } from 'vitest'
import {
  compileDocument,
  extractOutline,
  type DocumentOutline,
  type OutlineItem,
} from '../../src/features/doc-engine'
import { readPost } from '../../src/server/content'

describe('Canonical IR outline extraction', () => {
  it('creates one shared hierarchy with Chinese counts and embed markers', async () => {
    const source = [
      '# 验收文章',
      '',
      '## 第一节',
      '',
      '中文 空格。',
      '',
      '### 子级',
      '',
      '补充文字。',
      '',
      '![示意图](./media/images/example.png)',
      '',
      '<canvas-render id="plot" renderer="function-plot" data-src="./data/plot.json" width="640" height="360" />',
      '',
      '## 第二节',
      '',
      '短。👨‍👩‍👧‍👦',
      '',
      '<audio-embed id="voice" src="./media/audio/voice.mp3" title="音频标题" />',
      '',
      '## 思维图',
      '',
      '```mermaid',
      '%% 前导注释',
      '%%{init: {"theme": "base"}}%%',
      'mindmap',
      '  root((目录))',
      '```',
      '',
    ].join('\n')
    const { document, diagnostics } = await compileDocument({
      articleSlug: 'outline-golden',
      source,
      frontmatter: { title: '验收文章' },
    })

    expect(diagnostics).toEqual([])
    expect(projectOutline(extractOutline(document))).toMatchInlineSnapshot(`
      {
        "items": [
          {
            "characterCount": 94,
            "children": [
              {
                "characterCount": 28,
                "children": [
                  {
                    "characterCount": 21,
                    "children": [],
                    "depth": 3,
                    "embeds": {
                      "customTag": true,
                      "image": true,
                      "mindmap": false,
                    },
                    "slug": "子级",
                    "title": "子级",
                  },
                ],
                "depth": 2,
                "embeds": {
                  "customTag": true,
                  "image": true,
                  "mindmap": false,
                },
                "slug": "第一节",
                "title": "第一节",
              },
              {
                "characterCount": 7,
                "children": [],
                "depth": 2,
                "embeds": {
                  "customTag": false,
                  "image": false,
                  "mindmap": false,
                },
                "slug": "第二节",
                "title": "第二节",
              },
              {
                "characterCount": 50,
                "children": [],
                "depth": 2,
                "embeds": {
                  "customTag": false,
                  "image": false,
                  "mindmap": true,
                },
                "slug": "思维图",
                "title": "思维图",
              },
            ],
            "depth": 1,
            "embeds": {
              "customTag": true,
              "image": true,
              "mindmap": true,
            },
            "slug": "验收文章",
            "title": "验收文章",
          },
        ],
        "primarySectionSlugs": [
          "第一节",
          "第二节",
          "思维图",
        ],
      }
    `)

    const outline = extractOutline(document)
    expect(outline.primarySections[1]?.embeds).toEqual({
      customTag: false,
      image: false,
      mindmap: false,
    })
    expect(outline.primarySections[2]?.embeds).toEqual({
      customTag: false,
      image: false,
      mindmap: true,
    })
    expectOutlineFrozen(outline)
  })

  it('extracts the official P0 article from the same compiled document', async () => {
    const post = await readPost('p0-kitchen-sink')
    const { document, diagnostics } = await compileDocument({
      articleSlug: post.slug,
      source: post.source,
      frontmatter: post.frontmatter,
    })
    const outline = extractOutline(document)

    expect(diagnostics).toEqual([])
    expect(outline.primarySections.map((item) => item.title)).toMatchInlineSnapshot(`
      [
        "Markdown 与 GFM",
        "代码",
        "KaTeX",
        "Mermaid",
        "图片",
        "媒体与安全组件",
        "轻量问答",
        "结束",
      ]
    `)
    expect(
      outline.primarySections.map(({ title, characterCount, embeds }) => ({
        title,
        characterCount,
        embeds,
      })),
    ).toMatchInlineSnapshot(`
      [
        {
          "characterCount": 90,
          "embeds": {
            "customTag": false,
            "image": false,
            "mindmap": false,
          },
          "title": "Markdown 与 GFM",
        },
        {
          "characterCount": 52,
          "embeds": {
            "customTag": false,
            "image": false,
            "mindmap": false,
          },
          "title": "代码",
        },
        {
          "characterCount": 47,
          "embeds": {
            "customTag": false,
            "image": false,
            "mindmap": false,
          },
          "title": "KaTeX",
        },
        {
          "characterCount": 81,
          "embeds": {
            "customTag": false,
            "image": false,
            "mindmap": false,
          },
          "title": "Mermaid",
        },
        {
          "characterCount": 11,
          "embeds": {
            "customTag": false,
            "image": true,
            "mindmap": false,
          },
          "title": "图片",
        },
        {
          "characterCount": 91,
          "embeds": {
            "customTag": true,
            "image": false,
            "mindmap": false,
          },
          "title": "媒体与安全组件",
        },
        {
          "characterCount": 34,
          "embeds": {
            "customTag": true,
            "image": false,
            "mindmap": false,
          },
          "title": "轻量问答",
        },
        {
          "characterCount": 36,
          "embeds": {
            "customTag": false,
            "image": false,
            "mindmap": false,
          },
          "title": "结束",
        },
      ]
    `)
  })

  it('unwraps only a leading article-title H1 and preserves other root headings', async () => {
    const cases = [
      {
        name: 'content before the only H1',
        source: '前言。\n\n# 第一章\n\n## 子节\n',
        frontmatter: { title: '第一章' },
        expected: ['第一章'],
      },
      {
        name: 'frontmatter title mismatch',
        source: '# 第一章\n\n## 子节\n',
        frontmatter: { title: '另一标题' },
        expected: ['第一章'],
      },
      {
        name: 'no H1 with a skipped level',
        source: '## 第一章\n\n#### 跳级子节\n',
        frontmatter: { title: '文章标题' },
        expected: ['第一章'],
      },
      {
        name: 'multiple H1 headings',
        source: '# 第一章\n\n# 第二章\n',
        frontmatter: { title: '第一章' },
        expected: ['第一章', '第二章'],
      },
    ] as const

    for (const fixture of cases) {
      const { document } = await compileDocument({
        articleSlug: `outline-${fixture.name}`,
        source: fixture.source,
        frontmatter: fixture.frontmatter,
      })
      const outline = extractOutline(document)
      expect(
        outline.primarySections.map((item) => item.title),
        fixture.name,
      ).toEqual(fixture.expected)
    }
  })

  it('keeps component fallback headings scoped to the component', async () => {
    const source = [
      '## 外层章节',
      '',
      '<html-embed id="demo" src="./embeds/demo/index.html" title="Demo">',
      '### 仅降级可见',
      '',
      '降级正文。',
      '</html-embed>',
      '',
      '组件后的正文。',
      '',
    ].join('\n')
    const { document, diagnostics } = await compileDocument({
      articleSlug: 'outline-component-fallback',
      source,
      frontmatter: { title: '组件测试' },
    })
    const outline = extractOutline(document)

    expect(diagnostics).toEqual([])
    expect(projectOutline(outline)).toMatchObject({
      items: [
        {
          title: '外层章节',
          characterCount: 17,
          children: [],
          embeds: {
            customTag: true,
            image: false,
            mindmap: false,
          },
        },
      ],
      primarySectionSlugs: ['外层章节'],
    })
  })
})

function projectOutline(outline: ReturnType<typeof extractOutline>) {
  return {
    items: outline.items.map(projectItem),
    primarySectionSlugs: outline.primarySections.map((item) => item.slug),
  }
}

function projectItem(item: OutlineItem): object {
  return {
    slug: item.slug,
    title: item.title,
    depth: item.depth,
    characterCount: item.characterCount,
    embeds: item.embeds,
    children: item.children.map(projectItem),
  }
}

function expectOutlineFrozen(outline: DocumentOutline): void {
  expect(Object.isFrozen(outline)).toBe(true)
  expect(Object.isFrozen(outline.items)).toBe(true)
  expect(Object.isFrozen(outline.primarySections)).toBe(true)
  for (const item of flattenOutline(outline.items)) {
    expect(Object.isFrozen(item)).toBe(true)
    expect(Object.isFrozen(item.children)).toBe(true)
    expect(Object.isFrozen(item.embeds)).toBe(true)
  }
}

function flattenOutline(items: readonly OutlineItem[]): OutlineItem[] {
  return items.flatMap((item) => [item, ...flattenOutline(item.children)])
}
