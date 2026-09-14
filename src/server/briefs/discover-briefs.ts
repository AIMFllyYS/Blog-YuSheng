import 'server-only'

import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { parseBriefDate } from '../../features/daily-brief/brief-date'
import type { BriefEntry } from '../../features/daily-brief/types'
import { MAX_STATIC_FILE_BYTES } from '../content/asset-manifest'
import { briefPublicUrl, briefRouteHref, CONTENT_BRIEFS_ROOT } from './brief-paths'
import { parseBriefSource } from './parse-brief-source'

export type BriefDiagnostic = {
  readonly code:
    | 'BRIEF_DATE_INVALID'
    | 'BRIEF_DATE_DUPLICATE'
    | 'BRIEF_FILE_TOO_LARGE'
    | 'BRIEF_NOT_UTF8'
  readonly file: string
  readonly message: string
}

export class BriefBuildError extends Error {
  readonly diagnostics: readonly BriefDiagnostic[]

  constructor(message: string, diagnostics: readonly BriefDiagnostic[]) {
    super(`${message}\n${diagnostics.map((item) => `- ${item.message}`).join('\n')}`)
    this.name = 'BriefBuildError'
    this.diagnostics = diagnostics
  }
}

export type DiscoveredBrief = {
  readonly entry: BriefEntry
  readonly sourcePath: string
}

const BRIEF_FILENAME_DATE = /(\d{4}-\d{2}-\d{2})\.html?$/iu

/**
 * 递归扫描 `content/briefs/**​/*.html`。目录层级只是归档习惯（推荐按月），
 * 日期一律从文件名末尾的 `YYYY-MM-DD` 读取；重复日期、非法日期、超大文件都判为构建失败。
 */
export async function discoverBriefs(
  root = CONTENT_BRIEFS_ROOT,
): Promise<readonly DiscoveredBrief[]> {
  const files = (await collectHtmlFiles(root)).sort()
  const diagnostics: BriefDiagnostic[] = []
  const seen = new Map<string, string>()
  const discovered: DiscoveredBrief[] = []

  for (const filePath of files) {
    const relative = path.relative(root, filePath).split(path.sep).join('/')
    const dateText = BRIEF_FILENAME_DATE.exec(path.basename(filePath))?.[1]
    const calendar = dateText ? parseBriefDate(dateText) : undefined
    if (!dateText || !calendar) {
      diagnostics.push({
        code: 'BRIEF_DATE_INVALID',
        file: relative,
        message: `文件名末尾必须是 YYYY-MM-DD 合法日期：${relative}`,
      })
      continue
    }
    const previous = seen.get(calendar.date)
    if (previous) {
      diagnostics.push({
        code: 'BRIEF_DATE_DUPLICATE',
        file: relative,
        message: `同一天出现两份日报：${previous} 与 ${relative}`,
      })
      continue
    }
    seen.set(calendar.date, relative)

    const info = await stat(filePath)
    if (info.size > MAX_STATIC_FILE_BYTES) {
      diagnostics.push({
        code: 'BRIEF_FILE_TOO_LARGE',
        file: relative,
        message: `日报超过单文件 25 MB 上限：${relative}`,
      })
      continue
    }

    let source: string
    try {
      source = new TextDecoder('utf-8', { fatal: true }).decode(
        await readFile(filePath),
      )
    } catch {
      diagnostics.push({
        code: 'BRIEF_NOT_UTF8',
        file: relative,
        message: `日报必须是 UTF-8 编码：${relative}`,
      })
      continue
    }

    const meta = parseBriefSource(source, calendar.date)
    discovered.push({
      sourcePath: filePath,
      entry: {
        ...calendar,
        title: meta.title,
        headline: meta.headline,
        ...(meta.thesis ? { thesis: meta.thesis } : {}),
        ...(meta.style ? { style: meta.style } : {}),
        ...(meta.genre ? { genre: meta.genre } : {}),
        publicUrl: briefPublicUrl(calendar.date),
        href: briefRouteHref(calendar.date),
        bytes: info.size,
      },
    })
  }

  if (diagnostics.length > 0) {
    throw new BriefBuildError('小日报内容校验失败', diagnostics)
  }

  // 最新在前
  return discovered.sort((a, b) => (a.entry.date < b.entry.date ? 1 : -1))
}

export async function listBriefs(root?: string): Promise<readonly BriefEntry[]> {
  return (await discoverBriefs(root)).map((item) => item.entry)
}

export async function readBrief(date: string, root?: string): Promise<BriefEntry> {
  const entry = (await listBriefs(root)).find((item) => item.date === date)
  if (!entry) throw new Error(`找不到 ${date} 的小日报`)
  return entry
}

async function collectHtmlFiles(root: string): Promise<string[]> {
  const files: string[] = []
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch (error) {
    if (isMissingDirectory(error)) return files
    throw error
  }
  for (const entry of entries) {
    const target = path.join(root, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectHtmlFiles(target)))
    } else if (entry.isFile() && /\.html?$/iu.test(entry.name)) {
      files.push(target)
    }
  }
  return files
}

function isMissingDirectory(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  )
}
