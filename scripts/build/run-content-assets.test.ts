import { expect, test } from 'vitest'
import { buildContentAssets } from '../../src/server/content'

test('builds the validated content asset manifest into out', async () => {
  const manifest = await buildContentAssets()
  expect(manifest.length).toBeGreaterThan(0)
})
