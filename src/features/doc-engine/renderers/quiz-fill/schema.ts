import { z } from 'zod'

export const FILL_BLANK_QUESTION_SCHEMA = z
  .object({
    id: z.string().trim().min(1).max(96),
    'data-src': z.string().trim().min(1).max(512),
  })
  .strict()

export const FILL_BLANK_QUESTION_DATA_SCHEMA = z
  .object({
    prompt: z.string().trim().min(1).max(2_000),
    answers: z.array(z.string().min(1).max(500)).min(1).max(50),
    explanation: z.string().trim().min(1).max(4_000),
    trimWhitespace: z.boolean().default(true),
    caseSensitive: z.boolean().default(true),
  })
  .strict()
  .superRefine((value, context) => {
    const normalized = value.answers.map((answer) => {
      const trimmed = value.trimWhitespace ? answer.trim() : answer
      return value.caseSensitive
        ? trimmed
        : trimmed.replace(/[A-Z]/g, (character) => character.toLowerCase())
    })
    if (normalized.some((answer) => answer.length === 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '填空题答案规范化后不得为空。',
        path: ['answers'],
      })
    }
    if (new Set(normalized).size !== normalized.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '填空题答案规范化后不得重复。',
        path: ['answers'],
      })
    }
  })
  .transform((value) =>
    Object.freeze({
      ...value,
      answers: Object.freeze([...value.answers]),
    }),
  )

export type FillBlankQuestionData = z.output<
  typeof FILL_BLANK_QUESTION_DATA_SCHEMA
>

export function normalizeFillAnswer(
  value: string,
  options: Pick<FillBlankQuestionData, 'trimWhitespace' | 'caseSensitive'>,
): string {
  const trimmed = options.trimWhitespace ? value.trim() : value
  return options.caseSensitive
    ? trimmed
    : trimmed.replace(/[A-Z]/g, (character) => character.toLowerCase())
}
