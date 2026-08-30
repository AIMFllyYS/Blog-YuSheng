import { describe, expect, it } from 'vitest'

import {
  BUILTIN_RENDERER_REGISTRY,
  compileArticleDocumentWithDiagnostics,
  FUNCTION_PLOT_DATA_SCHEMA,
  getCanvasRendererRegistration,
  projectRendererNode,
  type RegisteredComponentNode,
} from '../../src/features/doc-engine'

const NODE = {
  type: 'registeredComponent',
  placement: 'block',
  name: 'canvas-render',
  nodeId: 'plot',
  componentId: 'plot',
  blockId: 'block-plot',
  attributes: {
    id: 'plot',
    renderer: 'function-plot',
    'data-src': './data/plot.json',
    width: 720,
    height: 360,
  },
  children: [],
  selectable: 'none',
  canonicalText: 'function-plot',
  sourceText: '<canvas-render id="plot" renderer="function-plot" data-src="./data/plot.json" width="720" height="360" />',
  sourceRange: {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 116, offset: 115 },
  },
} as const satisfies RegisteredComponentNode

describe('canvas renderer', () => {
  it('binds the static key to an audited loader and bounded schema', async () => {
    const registration = getCanvasRendererRegistration('function-plot')
    expect(registration?.validateData({
      expression: 'sin(x)',
      domain: [-6.283, 6.283],
      range: [-1.25, 1.25],
      samples: 240,
    })).toBe(true)
    expect(registration?.validateData({
      expression: 'alert(1)',
      domain: [0, 1],
      range: [0, 1],
      samples: 240,
    })).toBe(false)
    expect(FUNCTION_PLOT_DATA_SCHEMA.safeParse({
      expression: 'sin(x)',
      domain: [0, 101],
      range: [0, 1],
      samples: 240,
    }).success).toBe(false)
    expect(FUNCTION_PLOT_DATA_SCHEMA.safeParse({
      expression: 'sin(x)',
      domain: [9_999, 10_000],
      range: [0, 1],
      samples: 240,
    }).success).toBe(false)
    await expect(registration?.load()).resolves.toHaveProperty('drawFunctionPlot')
    expect(getCanvasRendererRegistration('evil-loader')).toBeUndefined()
  })

  it('provides browser, Markdown, and TXT projections outside discussion', () => {
    const definition = BUILTIN_RENDERER_REGISTRY.get('canvas-render')!
    expect(definition.allowedProfiles).toEqual(['article', 'editor-preview'])
    expect(definition.discussionCandidate).toBe(false)
    expect(definition.renderScreen(NODE, { profile: 'article' })).toEqual({
      kind: 'browser-screen-projection',
      rendererName: 'canvas-render',
      nodeId: 'plot',
    })
    expect(projectRendererNode(definition, 'markdown', NODE).value).toBe(NODE.sourceText)
    expect(projectRendererNode(definition, 'text', NODE).value).toBe(
      '[交互图形：function-plot]',
    )
  })

  it('enforces the cooperative draw deadline and per-article instance limit', async () => {
    const registration = getCanvasRendererRegistration('function-plot')!
    const canvas = {
      width: 100,
      height: 100,
      dataset: {},
      getContext: () => ({
        clearRect() {},
        fillRect() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
      }),
    } as unknown as HTMLCanvasElement
    await expect(
      registration.draw(
        canvas,
        {
          expression: 'sin(x)',
          domain: [-1, 1],
          range: [-1, 1],
          samples: 64,
        },
        1,
        -1,
      ),
    ).rejects.toThrow(/执行时间预算/)

    const source = Array.from(
      { length: 4 },
      (_, index) =>
        `<canvas-render id="plot-${index}" renderer="function-plot" />`,
    ).join('\n\n')
    const result = await compileArticleDocumentWithDiagnostics({
      articleSlug: 'canvas-limit',
      assetManifest: [],
      frontmatter: {},
      source,
    })
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'DOC-SECURITY-005',
        buildBlocking: true,
        nodeId: 'plot-3',
        message: expect.stringContaining('不得超过 3 个'),
        sourceRange: expect.objectContaining({
          start: expect.objectContaining({
            offset: source.lastIndexOf('<canvas-render'),
          }),
        }),
      }),
    ])
  })
})
