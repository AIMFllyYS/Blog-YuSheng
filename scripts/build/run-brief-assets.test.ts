import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from 'vitest'
import { buildBriefAssets } from '../../src/server/briefs'

test('copies every daily brief into out/briefs and keeps the route pages in sync', async () => {
  const briefs = await buildBriefAssets()
  expect(briefs.length).toBeGreaterThan(0)

  const out = path.join(process.cwd(), 'out')
  for (const brief of briefs) {
    const copied = await stat(path.join(out, 'briefs', `${brief.entry.date}.html`))
    expect(copied.size).toBe(brief.entry.bytes)
  }

  const latest = briefs[0]!
  const routeHtml = await readFile(
    path.join(out, 'daily', latest.entry.date, 'index.html'),
    'utf8',
  )
  expect(routeHtml).toContain(`src="${latest.entry.publicUrl}"`)
  expect(routeHtml).toContain('sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"')
})
