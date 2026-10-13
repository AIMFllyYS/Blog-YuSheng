import { readFileSync } from 'node:fs'

const files = ['.env', '.env.local']

export function loadLocalEnv() {
  const fromFiles = new Map()
  for (const file of files) {
    let source
    try {
      source = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    if (source.charCodeAt(0) === 0xfeff) source = source.slice(1)
    for (const line of source.split(/\r?\n/u)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const separator = trimmed.indexOf('=')
      if (separator <= 0) continue
      const key = trimmed.slice(0, separator).trim()
      let value = trimmed.slice(separator + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      fromFiles.set(key, value)
    }
  }
  for (const [key, value] of fromFiles) {
    if (process.env[key] === undefined) process.env[key] = value
  }
}
