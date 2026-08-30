import { describe, expect, it } from 'vitest'

import { compileDocument } from '../../src/features/doc-engine'

const FRONT = ''

describe('article design language tags', () => {
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
