import 'server-only'

import { VFile } from 'vfile'
import { matter } from 'vfile-matter'

/**
 * 复用 frontmatter 的 YAML 解析器读取独立 YAML 文档（如 content/sections.yml），
 * 通过包裹 --- 围栏把整份文档当作 frontmatter 解析，避免引入第二个 YAML 依赖。
 * 文档内容不得出现以 --- 开头的行；解析失败时由调用方捕获并转成构建诊断。
 */
export function parseYamlDocument(source: string): unknown {
  const file = new VFile({ value: `---\n${source}\n---\n` })
  matter(file)
  return file.data.matter
}
