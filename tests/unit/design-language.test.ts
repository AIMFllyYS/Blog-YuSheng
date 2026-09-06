import { describe, expect, it } from 'vitest'

import { compileDocument } from '../../src/features/doc-engine'

const FRONT = ''

describe('article design language tags', () => {
  it('keeps inline marks inside complete list items in a flow component', async () => {
    const source = `<inset-card id="terms" title="部署术语">
#### 几个词

- <text-mark tone="thesis">域名</text-mark>与 <text-mark tone="thesis">IP</text-mark>如何绑定
- <text-mark tone="thesis">SSL 证书</text-mark>：为什么网站需要它
- <text-mark tone="thesis">端口</text-mark>：本地与线上分别怎么用
- <text-mark tone="thesis">pm2</text-mark>：守护进程，保证服务不掉线
</inset-card>`
    const result = await compileDocument({ articleSlug: 'flow-inline-list', source, frontmatter: {} })
    expect(result.diagnostics).toEqual([])
    const card = result.document.root.children[0]!
    if (card.type !== 'registeredComponent' || card.placement !== 'block') throw new Error('missing card')
    expect(card.children.map((node) => node.type)).toEqual(['heading', 'list'])
    const list = card.children[1]!
    if (list.type !== 'list') throw new Error('missing list')
    expect(list.children).toHaveLength(4)
    expect(list.children.map((node) => node.children.map((child) => child.canonicalText).join(''))).toEqual([
      '域名与 IP如何绑定', 'SSL 证书：为什么网站需要它',
      '端口：本地与线上分别怎么用', 'pm2：守护进程，保证服务不掉线',
    ])
  })

  it('does not split emphasis, tables or quotes around an inline mark', async () => {
    const source = `<aside-note id="flow" kind="addon">
句子前<text-mark tone="thesis">重点</text-mark>句子后。

> 引用<text-mark tone="note">原句</text-mark>。

| 术语 | 解释 |
| --- | --- |
| <text-mark tone="thesis">SDK</text-mark> | 工具包 |
</aside-note>`
    const result = await compileDocument({ articleSlug: 'flow-inline-table', source, frontmatter: {} })
    expect(result.diagnostics).toEqual([])
    const note = result.document.root.children[0]!
    if (note.type !== 'registeredComponent' || note.placement !== 'block') throw new Error('missing note')
    expect(note.children.map((node) => node.type)).toEqual(['paragraph', 'quote', 'table'])
    expect(note.children[0]?.canonicalText).toBe('句子前重点句子后。')
  })
  it('compiles inline text-mark inside a Chinese paragraph', async () => {
    const source = `${FRONT}AI 是<text-mark tone="thesis" effect="fluorescent">杠杆</text-mark>，专业知识是支点。\n`
    const result = await compileDocument({
      articleSlug: 'design-inline',
      source,
      frontmatter: {},
    })
    expect(result.diagnostics.filter((item) => item.severity === 'error')).toEqual([])
    const paragraph = result.document.root.children.find((node) => node.type === 'paragraph')
    expect(paragraph?.type).toBe('paragraph')
    if (paragraph?.type !== 'paragraph') return
    const mark = paragraph.children.find(
      (node) => node.type === 'registeredComponent' && node.name === 'text-mark',
    )
    expect(mark).toMatchObject({
      placement: 'inline',
      selectable: 'text-range',
      attributes: { tone: 'thesis', effect: 'fluorescent' },
      canonicalText: '杠杆',
    })
    expect(paragraph.canonicalText).toBe('AI 是杠杆，专业知识是支点。')
  })

  it('compiles aside-note with blank lines inside', async () => {
    const source = `${FRONT}<aside-note id="thesis" kind="callout" title="先说结论">\n\n整个技术板块的问题不是钻得不够深。\n\n</aside-note>\n`
    const result = await compileDocument({
      articleSlug: 'design-aside',
      source,
      frontmatter: {},
    })
    expect(result.diagnostics.filter((item) => item.severity === 'error')).toEqual([])
    const note = result.document.root.children.find(
      (node) => node.type === 'registeredComponent' && node.name === 'aside-note',
    )
    expect(note).toMatchObject({
      placement: 'block',
      selectable: 'text-range',
      componentId: 'thesis',
    })
    if (note?.type === 'registeredComponent' && note.placement === 'block') {
      expect(note.children.some((child) => child.type === 'paragraph')).toBe(true)
    }
  })

  it('compiles a two-sided compare-block', async () => {
    const source = `${FRONT}<compare-block id="ui">
<compare-side role="bad" title="差">不行。</compare-side>
<compare-side role="good" title="好">可以。</compare-side>
</compare-block>
`
    const result = await compileDocument({
      articleSlug: 'design-compare-ok',
      source,
      frontmatter: {},
    })
    expect(result.diagnostics.filter((item) => item.severity === 'error')).toEqual([])
    const block = result.document.root.children.find(
      (node) => node.type === 'registeredComponent' && node.name === 'compare-block',
    )
    expect(block?.type).toBe('registeredComponent')
    if (block?.type === 'registeredComponent' && block.placement === 'block') {
      expect(block.children).toHaveLength(2)
      expect(block.children.map((child) => 'name' in child && child.name)).toEqual([
        'compare-side',
        'compare-side',
      ])
    }
  })

  it('requires exactly two compare-side children', async () => {
    const source = `${FRONT}<compare-block id="ui">\n<compare-side role="bad" title="差">不行。</compare-side>\n</compare-block>\n`
    const result = await compileDocument({
      articleSlug: 'design-compare-bad',
      source,
      frontmatter: {},
    })
    expect(result.diagnostics.some((item) => item.message.includes('两个 compare-side'))).toBe(
      true,
    )
  })

  it('rejects raw span and style attributes', async () => {
    const raw = await compileDocument({
      articleSlug: 'design-raw',
      source: `${FRONT}<span style="color:red">红</span>\n`,
      frontmatter: {},
    })
    expect(raw.diagnostics.some((item) => item.code === 'DOC-PARSE-001')).toBe(true)

    const styled = await compileDocument({
      articleSlug: 'design-style',
      source: `${FRONT}这是<text-mark tone="thesis" style="color:red">错</text-mark>。\n`,
      frontmatter: {},
    })
    expect(
      styled.diagnostics.some(
        (item) => item.code === 'DOC-REGISTRY-002' || item.code === 'DOC-PARSE-003',
      ),
    ).toBe(true)
  })

  it('keeps html-embed fallback-text behavior', async () => {
    const source = `${FRONT}<html-embed id="mini-card" src="./embeds/mini-card/index.html" title="小页">\n打不开时看这里。\n</html-embed>\n`
    const result = await compileDocument({
      articleSlug: 'design-html',
      source,
      frontmatter: {},
    })
    const embed = result.document.root.children.find(
      (node) => node.type === 'registeredComponent' && node.name === 'html-embed',
    )
    expect(embed).toMatchObject({
      placement: 'block',
      selectable: 'none',
      canonicalText: '打不开时看这里。',
    })
  })
})
