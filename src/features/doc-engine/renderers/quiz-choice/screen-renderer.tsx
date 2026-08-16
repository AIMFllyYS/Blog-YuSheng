'use client'

import { useId, useState } from 'react'

import type { RegisteredComponentNode } from '../../core'
import { DocumentFallbackCard } from '../../screen/fallback-card'
import {
  CHOICE_QUESTION_DATA_SCHEMA,
  CHOICE_QUESTION_RENDER_DATA_SCHEMA,
} from './schema'

export function ChoiceQuestionScreenRenderer({
  data,
  node,
}: {
  readonly data: unknown
  readonly node: RegisteredComponentNode
}) {
  const authorData = CHOICE_QUESTION_DATA_SCHEMA.safeParse(data)
  const parsed = authorData.success
    ? authorData
    : CHOICE_QUESTION_RENDER_DATA_SCHEMA.safeParse(data)
  if (!parsed.success) {
    return (
      <DocumentFallbackCard
        blockId={node.blockId}
        code="DOC-RENDER-001"
        message="这道选择题的数据暂时不可用。"
        nodeId={node.nodeId}
        selectable="none"
      />
    )
  }
  return <ChoiceQuestionCard data={parsed.data} node={node} />
}

function ChoiceQuestionCard({
  data,
  node,
}: {
  readonly data: {
    readonly prompt: string
    readonly options: readonly {
      readonly id: string
      readonly label: string
    }[]
    readonly answers: readonly string[]
    readonly multiple: boolean
    readonly explanation: string
  }
  readonly node: RegisteredComponentNode
}) {
  const groupName = useId()
  const [selected, setSelected] = useState<readonly string[]>([])
  const [correct, setCorrect] = useState<boolean | undefined>()

  function updateSelection(optionId: string, checked: boolean) {
    setCorrect(undefined)
    if (!data.multiple) {
      setSelected([optionId])
      return
    }
    setSelected((current) =>
      checked
        ? Object.freeze([...current, optionId])
        : Object.freeze(current.filter((value) => value !== optionId)),
    )
  }

  function checkAnswer() {
    const expected = new Set(data.answers)
    setCorrect(
      selected.length === expected.size &&
        selected.every((value) => expected.has(value)),
    )
  }

  function reset() {
    setSelected([])
    setCorrect(undefined)
  }

  return (
    <section
      className="my-8 rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-5"
      data-block-id={node.blockId}
      data-node-id={node.nodeId}
      data-quiz-kind="choice"
      data-quiz-state={correct === undefined ? 'answering' : correct ? 'correct' : 'incorrect'}
      data-selectable="none"
    >
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-muted)]">
        {data.multiple ? '多选题' : '单选题'} · 本地自测
      </p>
      <fieldset className="mt-3">
        <legend className="text-base font-semibold leading-7">{data.prompt}</legend>
        {data.multiple ? (
          <p className="mt-1 text-xs text-[var(--ink-muted)]">可选择一个或多个答案</p>
        ) : null}
        <div className="mt-4 grid gap-2">
          {data.options.map((option) => {
            const checked = selected.includes(option.id)
            return (
              <label
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--line)] px-4 py-3 text-sm"
                key={option.id}
              >
                <input
                  checked={checked}
                  className="mt-0.5"
                  name={groupName}
                  onChange={(event) => updateSelection(option.id, event.target.checked)}
                  type={data.multiple ? 'checkbox' : 'radio'}
                  value={option.id}
                />
                <span>{option.label}</span>
              </label>
            )
          })}
        </div>
      </fieldset>
      <QuizActions
        canCheck={selected.length > 0}
        checked={correct !== undefined}
        onCheck={checkAnswer}
        onReset={reset}
      />
      <QuizFeedback correct={correct} explanation={data.explanation} />
    </section>
  )
}

function QuizActions({
  canCheck,
  checked,
  onCheck,
  onReset,
}: {
  readonly canCheck: boolean
  readonly checked: boolean
  readonly onCheck: () => void
  readonly onReset: () => void
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!canCheck}
        onClick={onCheck}
        type="button"
      >
        检查答案
      </button>
      {checked ? (
        <button
          className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
          onClick={onReset}
          type="button"
        >
          重新作答
        </button>
      ) : null}
    </div>
  )
}

function QuizFeedback({
  correct,
  explanation,
}: {
  readonly correct: boolean | undefined
  readonly explanation: string
}) {
  if (correct === undefined) return null
  return (
    <div
      aria-live="polite"
      className="mt-4 rounded-xl border border-[var(--line)] p-4 text-sm"
      data-quiz-feedback={correct ? 'correct' : 'incorrect'}
      role="status"
    >
      <p className="font-semibold">{correct ? '回答正确' : '回答不正确，请再想一想'}</p>
      <p className="mt-1 text-[var(--ink-muted)]">{explanation}</p>
    </div>
  )
}
