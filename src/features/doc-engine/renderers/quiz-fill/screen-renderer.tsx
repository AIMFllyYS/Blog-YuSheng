'use client'

import { useId, useState } from 'react'

import type { RegisteredComponentNode } from '../../core'
import { DocumentFallbackCard } from '../../screen/fallback-card'
import {
  FILL_BLANK_QUESTION_DATA_SCHEMA,
  normalizeFillAnswer,
} from './schema'

export function FillBlankQuestionScreenRenderer({
  data,
  node,
}: {
  readonly data: unknown
  readonly node: RegisteredComponentNode
}) {
  const parsed = FILL_BLANK_QUESTION_DATA_SCHEMA.safeParse(data)
  if (!parsed.success) {
    return (
      <DocumentFallbackCard
        blockId={node.blockId}
        code="DOC-RENDER-001"
        message="这道填空题的数据暂时不可用。"
        nodeId={node.nodeId}
        selectable="none"
      />
    )
  }
  return <FillBlankQuestionCard data={parsed.data} node={node} />
}

function FillBlankQuestionCard({
  data,
  node,
}: {
  readonly data: ReturnType<typeof FILL_BLANK_QUESTION_DATA_SCHEMA.parse>
  readonly node: RegisteredComponentNode
}) {
  const inputId = useId()
  const [answer, setAnswer] = useState('')
  const [correct, setCorrect] = useState<boolean | undefined>()

  function checkAnswer() {
    const normalized = normalizeFillAnswer(answer, data)
    setCorrect(
      data.answers.some(
        (candidate) => normalizeFillAnswer(candidate, data) === normalized,
      ),
    )
  }

  function reset() {
    setAnswer('')
    setCorrect(undefined)
  }

  return (
    <section
      className="my-8 rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-5"
      data-block-id={node.blockId}
      data-node-id={node.nodeId}
      data-quiz-kind="fill"
      data-quiz-state={correct === undefined ? 'answering' : correct ? 'correct' : 'incorrect'}
      data-selectable="none"
    >
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-muted)]">
        填空题 · 本地自测
      </p>
      <label className="mt-3 block text-base font-semibold leading-7" htmlFor={inputId}>
        {data.prompt}
      </label>
      <input
        autoComplete="off"
        className="mt-4 w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]"
        id={inputId}
        onChange={(event) => {
          setAnswer(event.target.value)
          setCorrect(undefined)
        }}
        spellCheck={false}
        type="text"
        value={answer}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={answer.length === 0}
          onClick={checkAnswer}
          type="button"
        >
          检查答案
        </button>
        {correct !== undefined ? (
          <button
            className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
            onClick={reset}
            type="button"
          >
            重新作答
          </button>
        ) : null}
      </div>
      {correct === undefined ? null : (
        <div
          aria-live="polite"
          className="mt-4 rounded-xl border border-[var(--line)] p-4 text-sm"
          data-quiz-feedback={correct ? 'correct' : 'incorrect'}
          role="status"
        >
          <p className="font-semibold">{correct ? '回答正确' : '回答不正确，请再想一想'}</p>
          <p className="mt-1 text-[var(--ink-muted)]">{data.explanation}</p>
        </div>
      )}
    </section>
  )
}
