import { describe, expect, it } from 'vitest'

import { validateHtmlEmbedProtocol } from '../../src/server/content'

const VALID_EMBED = `
  const nonce = new URLSearchParams(location.hash.slice(1)).get('nonce')
  window.parent.postMessage({ nonce, message: { type: 'ready' } }, '*')
  window.parent.postMessage(
    { type: 'resize', height: document.documentElement.scrollHeight },
    '*',
  )
`
const NONCE_EXTRACTION =
  "const nonce = new URLSearchParams(location.hash.slice(1)).get('nonce')"
const READY_HANDSHAKE =
  "window.parent.postMessage({ nonce, message: { type: 'ready' } }, '*')"
const RESIZE_REPORT = `window.parent.postMessage(
    { type: 'resize', height: document.documentElement.scrollHeight },
    '*',
  )`

describe('author-owned HTML embed protocol', () => {
  it('accepts the nonce ready handshake and resize report', () => {
    expect(validateHtmlEmbedProtocol(VALID_EMBED)).toEqual({ ok: true })
  })

  it.each([
    ['nonce extraction', NONCE_EXTRACTION],
    ['ready handshake', READY_HANDSHAKE],
    ['resize report', RESIZE_REPORT],
  ])('rejects embeds without a %s', (_, missingPart) => {
    const source = VALID_EMBED.replace(missingPart, '')
    expect(validateHtmlEmbedProtocol(source)).toMatchObject({ ok: false })
  })
})
