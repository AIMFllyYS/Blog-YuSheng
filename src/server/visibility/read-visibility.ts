import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  parseVisibilitySource,
} from './visibility-json.mjs'

export type VisibilityList = {
  readonly posts: readonly string[]
  readonly briefs: readonly string[]
}

export const VISIBILITY_FILE = path.join(process.cwd(), 'content', 'visibility.json')

export class VisibilityFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VisibilityFileError'
  }
}

export async function readVisibility(filePath = VISIBILITY_FILE): Promise<VisibilityList> {
  let source: string
  try {
    source = await readFile(filePath, 'utf8')
  } catch (error) {
    if (isMissingFile(error)) {
      throw new VisibilityFileError(`找不到可见性清单：${filePath}`)
    }
    throw error
  }
  const parsed = parseVisibilitySource(source)
  if (!parsed.ok) throw new VisibilityFileError(parsed.message)
  return parsed.value
}

export function isSameContentRoot(root: string | undefined, repoRoot: string) {
  return path.resolve(root ?? repoRoot) === path.resolve(repoRoot)
}

function isMissingFile(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  )
}
