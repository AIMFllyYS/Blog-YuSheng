import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  BUILTIN_RENDERER_REGISTRY,
  CHOICE_QUESTION_DATA_SCHEMA,
  compileDocument,
  FILL_BLANK_QUESTION_DATA_SCHEMA,
  normalizeFillAnswer,
  projectPackageAssetData,
  type RegisteredComponentNode,
} from '../../src/features/doc-engine'
import { ChoiceQuestionScreenRenderer } from '../../src/features/doc-engine/renderers/quiz-choice/screen-renderer'
import { FillBlankQuestionScreenRenderer } from '../../src/features/doc-engine/renderers/quiz-fill/screen-renderer'

const ARTICLE_SLUG = 'quiz-unit'
const SOURCE = [
  '<choice-question id="single" data-src="./data/single.json" />',
  '',
  '<choice-question id="multiple" data-src="./data/multiple.json" />',
  '',
  '<fill-blank-question id="fill" data-src="./data/fill.json" />',
].join('\n')

const SINGLE_DATA = {
  prompt: '唯一权威源是什么？',
  options: [
    { id: 'a', label: 'index.md' },
    { id: 'b', label: 'DOM' },
  ],
  answer: 'a',
  explanation: 'index.md 是正式正本。',
}
const MULTIPLE_DATA = {
  prompt: '选择正式内容组成。',
  options: [
    { id: 'a', label: 'Markdown' },
    { id: 'b', label: '包内资源' },
    { id: 'c', label: '当前 DOM' },
  ],
  answer: ['a', 'b'],
  explanation: '正文与包内资源共同组成正式内容。',
}
const FILL_DATA = {
  prompt: '公开标识称为 ____。',
  answers: ['slug', '文章标识'],
  trimWhitespace: true,
  caseSensitive: false,
  explanation: '两种答案都可接受。',
}

describe('choice and fill quiz renderers', () => {
  it('normalizes strict single, multiple, and multilingual fill data', () => {
    expect(CHOICE_QUESTION_DATA_SCHEMA.parse(SINGLE_DATA)).toMatchObject({
      answers: ['a'],
      multiple: false,
    })
    expect(CHOICE_QUESTION_DATA_SCHEMA.parse(MULTIPLE_DATA)).toMatchObject({
      answers: ['a', 'b'],
      multiple: true,
    })
    expect(FILL_BLANK_QUESTION_DATA_SCHEMA.parse(FILL_DATA)).toMatchObject({
      answers: ['slug', '文章标识'],
      trimWhitespace: true,
      caseSensitive: false,
    })
    expect(normalizeFillAnswer('  SLUG  ', FILL_DATA)).toBe('slug')
    expect(normalizeFillAnswer('文章标识', FILL_DATA)).toBe('文章标识')
  })

  it('rejects missing fields, duplicate options, and answers outside the option set', () => {
    expect(
      CHOICE_QUESTION_DATA_SCHEMA.safeParse({
        ...SINGLE_DATA,
        explanation: undefined,
      }).success,
    ).toBe(false)
    expect(
      CHOICE_QUESTION_DATA_SCHEMA.safeParse({
        ...SINGLE_DATA,
        options: [
          { id: 'a', label: '一' },
          { id: 'a', label: '二' },
        ],
      }).success,
    ).toBe(false)
    expect(
      CHOICE_QUESTION_DATA_SCHEMA.safeParse({
        ...SINGLE_DATA,
        answer: 'missing',
      }).success,
    ).toBe(false)
    expect(
      FILL_BLANK_QUESTION_DATA_SCHEMA.safeParse({ prompt: '缺字段' }).success,
    ).toBe(false)
    expect(
      FILL_BLANK_QUESTION_DATA_SCHEMA.safeParse({
        ...FILL_DATA,
        answers: ['   '],
      }).success,
    ).toBe(false)
    expect(
      FILL_BLANK_QUESTION_DATA_SCHEMA.safeParse({
        ...FILL_DATA,
        answers: ['YES', ' yes '],
      }).success,
    ).toBe(false)
  })

  it('registers browser projections, local assets, and article-only profiles', async () => {
    const [single, multiple, fill] = await quizNodes()
    const choice = BUILTIN_RENDERER_REGISTRY.get('choice-question')!
    const blank = BUILTIN_RENDERER_REGISTRY.get('fill-blank-question')!

    expect(choice.allowedProfiles).toEqual(['article', 'editor-preview'])
    expect(blank.allowedProfiles).toEqual(['article', 'editor-preview'])
    expect(choice.discussionCandidate).toBe(false)
    expect(blank.discussionCandidate).toBe(false)
    expect(choice.renderScreen(single, { profile: 'article' })).toMatchObject({
      kind: 'browser-screen-projection',
      rendererName: 'choice-question',
    })
    expect(choice.collectAssets(multiple)).toEqual([
      {
        source: './data/multiple.json',
        kind: 'local',
        attribute: 'data-src',
      },
    ])
    expect(blank.collectAssets(fill)).toEqual([
      { source: './data/fill.json', kind: 'local', attribute: 'data-src' },
    ])
  })

  it('preserves Markdown and projects static TXT with optional answers', async () => {
    const [single, , fill] = await quizNodes()
    const choice = BUILTIN_RENDERER_REGISTRY.get('choice-question')!
    const blank = BUILTIN_RENDERER_REGISTRY.get('fill-blank-question')!

    expect(choice.renderMarkdown?.(single, { profile: 'article' })).toBe(
      SOURCE.split('\n')[0],
    )
    expect(
      choice.renderText?.(single, {
        profile: 'article',
        data: SINGLE_DATA,
        includeAnswers: false,
      }),
    ).toContain('【选择题】唯一权威源是什么？')
    expect(
      choice.renderText?.(single, {
        profile: 'article',
        data: SINGLE_DATA,
        includeAnswers: true,
      }),
    ).toContain('答案：a')
    expect(
      blank.renderText?.(fill, {
        profile: 'article',
        data: FILL_DATA,
        includeAnswers: true,
      }),
    ).toContain('可接受答案：slug、文章标识')
  })

  it('renders accessible static cards and fails closed for invalid runtime data', async () => {
    const [single, multiple, fill] = await quizNodes()
    const singleHtml = renderToStaticMarkup(
      <ChoiceQuestionScreenRenderer data={SINGLE_DATA} node={single} />,
    )
    const multipleHtml = renderToStaticMarkup(
      <ChoiceQuestionScreenRenderer data={MULTIPLE_DATA} node={multiple} />,
    )
    const fillHtml = renderToStaticMarkup(
      <FillBlankQuestionScreenRenderer data={FILL_DATA} node={fill} />,
    )
    const invalidHtml = renderToStaticMarkup(
      <FillBlankQuestionScreenRenderer data={{}} node={fill} />,
    )

    expect(singleHtml).toContain('type="radio"')
    expect(singleHtml).toContain('检查答案')
    expect(singleHtml).toContain('data-selectable="none"')
    expect(multipleHtml).toContain('type="checkbox"')
    expect(fillHtml).toContain('<input')
    expect(fillHtml).not.toContain('localStorage')
    expect(invalidHtml).toContain('data-document-fallback="DOC-RENDER-001"')
  })

  it('projects validated build data by article, renderer type, and package path', async () => {
    const [single] = await quizNodes()
    const manifest = [
      {
        articleSlug: ARTICLE_SLUG,
        nodeId: single.nodeId,
        nodeName: single.name,
        outputPath: `blog/${ARTICLE_SLUG}/data/single.json`,
        data: SINGLE_DATA,
      },
    ]
    expect(
      projectPackageAssetData(
        './data/single.json',
        ARTICLE_SLUG,
        single.name,
        manifest,
      ),
    ).toBe(SINGLE_DATA)
    expect(
      projectPackageAssetData(
        './data/single.json',
        'another-article',
        single.name,
        manifest,
      ),
    ).toBeUndefined()
  })
})

async function quizNodes(): Promise<
  readonly [
    RegisteredComponentNode,
    RegisteredComponentNode,
    RegisteredComponentNode,
  ]
> {
  const { document, diagnostics } = await compileDocument({
    articleSlug: ARTICLE_SLUG,
    assetManifest: [],
    frontmatter: {},
    source: SOURCE,
  })
  expect(diagnostics).toEqual([])
  const [single, multiple, fill] = document.root.children
  if (
    single?.type !== 'registeredComponent' ||
    multiple?.type !== 'registeredComponent' ||
    fill?.type !== 'registeredComponent'
  ) {
    throw new Error('fixture 未编译为问答组件')
  }
  return [single, multiple, fill]
}
