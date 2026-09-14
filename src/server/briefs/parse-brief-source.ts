import 'server-only'

/**
 * 从日报原件 HTML 里抽取元数据。纯字符串处理，不解析 DOM、不改写原件。
 * Bot 的契约只要求 `<title>`；`<!-- DESIGN LESSON -->` 块是可选增强。
 */

export type BriefSourceMeta = {
  readonly title: string
  readonly headline: string
  readonly thesis?: string
  readonly style?: string
  readonly genre?: string
}

const BRAND_WORDS = ['折晓早报', '折晓晚刊', '折晓', '早报', '晚刊', 'Med-YuSheng']

export function parseBriefSource(source: string, date: string): BriefSourceMeta {
  const title = readTitle(source) ?? `折晓早报 · ${date}`
  const lesson = readDesignLesson(source)
  const headline = lesson.TITLE
    ? stripBookTitle(lesson.TITLE)
    : deriveHeadline(title, date)
  return {
    title,
    headline,
    thesis: lesson.THESIS,
    style: lesson.STYLE,
    genre: lesson.GENRE,
  }
}

function readTitle(source: string): string | undefined {
  const match = /<title>([\s\S]*?)<\/title>/iu.exec(source)
  const text = match?.[1]?.replace(/\s+/gu, ' ').trim()
  return text ? decodeBasicEntities(text) : undefined
}

function readDesignLesson(source: string): Record<string, string> {
  const block = /<!--\s*DESIGN LESSON([\s\S]*?)-->/u.exec(source)?.[1]
  if (!block) return {}
  const fields: Record<string, string> = {}
  for (const line of block.split(/\r?\n/u)) {
    const match = /^\s*([A-Z][A-Z ]{1,24}):\s*(.+?)\s*$/u.exec(line)
    if (!match) continue
    const key = match[1]!.trim()
    if (!['TITLE', 'STYLE', 'GENRE', 'THESIS'].includes(key)) continue
    fields[key] = match[2]!.trim()
  }
  return fields
}

/** 去掉《》书名号 */
function stripBookTitle(value: string): string {
  return value.replace(/^《(.+?)》.*$/u, '$1').trim()
}

/**
 * `<title>` 常见形态：「折晓早报 · 注资轨 · 2026-09-14」「限速中 · Med-YuSheng 早报 · 2026-08-19」。
 * 按 `·` 切开，剔除日期与品牌片段，剩下的第一段就是短标题；剔完为空则回退整段。
 */
function deriveHeadline(title: string, date: string): string {
  const compactDate = date.replace(/-/gu, '')
  const shortDate = date.slice(5).replace('-', '.')
  const segments = title
    .split(/\s*[·|｜]\s*/u)
    .map((segment) => segment.trim())
    .filter(Boolean)
  const kept = segments.filter((segment) => {
    if (segment.includes(date) || segment.includes(compactDate)) return false
    if (segment.includes(shortDate)) return false
    if (/^\d{4}-\d{2}-\d{2}$/u.test(segment)) return false
    if (/^(?:VOL|REV|ROLL|LEVEL|TODAY|SAT|SUN|MON|TUE|WED|THU|FRI)\b/iu.test(segment)) {
      return false
    }
    if (/^\d{4}$/u.test(segment) || /^\d{1,2}\.\d{1,2}$/u.test(segment)) return false
    const withoutBrand = BRAND_WORDS.reduce(
      (text, word) => text.replace(word, ''),
      segment,
    ).trim()
    return withoutBrand.length > 0 && withoutBrand === segment
  })
  const headline = kept[0] ?? segments[0] ?? title
  return stripBookTitle(headline).slice(0, 40)
}

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&amp;/gu, '&')
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/&nbsp;/gu, ' ')
}
