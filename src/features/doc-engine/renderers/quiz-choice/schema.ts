import { z } from 'zod'

export const CHOICE_QUESTION_SCHEMA = z
  .object({
    id: z.string().trim().min(1).max(96),
    'data-src': z.string().trim().min(1).max(512),
  })
  .strict()

const CHOICE_OPTION_SCHEMA = z
  .object({
    id: z.string().trim().min(1).max(64),
    label: z.string().trim().min(1).max(500),
  })
  .strict()

export const CHOICE_QUESTION_DATA_SCHEMA = z
  .object({
    prompt: z.string().trim().min(1).max(2_000),
    options: z.array(CHOICE_OPTION_SCHEMA).min(2).max(20),
    answer: z.union([
      z.string().trim().min(1).max(64),
      z.array(z.string().trim().min(1).max(64)).min(1).max(20),
    ]),
    explanation: z.string().trim().min(1).max(4_000),
  })
  .strict()
  .superRefine((value, context) => {
    const optionIds = value.options.map((option) => option.id)
    if (new Set(optionIds).size !== optionIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '选择题选项 ID 不得重复。',
        path: ['options'],
      })
    }
    const answers = Array.isArray(value.answer) ? value.answer : [value.answer]
    if (new Set(answers).size !== answers.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '选择题答案 ID 不得重复。',
        path: ['answer'],
      })
    }
    for (const answer of answers) {
      if (!optionIds.includes(answer)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `选择题答案未命中选项：${answer}`,
          path: ['answer'],
        })
      }
    }
  })
  .transform((value) =>
    Object.freeze({
      prompt: value.prompt,
      options: Object.freeze(
        value.options.map((option) => Object.freeze({ ...option })),
      ),
      answers: Object.freeze(
        Array.isArray(value.answer) ? [...value.answer] : [value.answer],
      ),
      multiple: Array.isArray(value.answer),
      explanation: value.explanation,
    }),
  )

export const CHOICE_QUESTION_RENDER_DATA_SCHEMA = z
  .object({
    prompt: z.string().trim().min(1).max(2_000),
    options: z.array(CHOICE_OPTION_SCHEMA).min(2).max(20),
    answers: z.array(z.string().trim().min(1).max(64)).min(1).max(20),
    multiple: z.boolean(),
    explanation: z.string().trim().min(1).max(4_000),
  })
  .strict()
  .superRefine((value, context) => {
    const optionIds = value.options.map((option) => option.id)
    if (new Set(optionIds).size !== optionIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '选择题选项 ID 不得重复。',
        path: ['options'],
      })
    }
    if (new Set(value.answers).size !== value.answers.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '选择题答案 ID 不得重复。',
        path: ['answers'],
      })
    }
    if (!value.multiple && value.answers.length !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '单选题必须只有一个答案。',
        path: ['answers'],
      })
    }
    for (const answer of value.answers) {
      if (!optionIds.includes(answer)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `选择题答案未命中选项：${answer}`,
          path: ['answers'],
        })
      }
    }
  })

export type ChoiceQuestionData = z.output<typeof CHOICE_QUESTION_DATA_SCHEMA>
