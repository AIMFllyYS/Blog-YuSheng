import { describe, expect, it } from 'vitest'

import edgeoneConfig from '../../edgeone.json'
import {
  EMBED_CAPABILITY_FRAGMENT_KEY,
  EMBED_MESSAGE_SCHEMA,
  HTML_EMBED_IFRAME_POLICY,
  HTML_EMBED_READY_TIMEOUT_MS,
  WEB_EMBED_ETLD_PLUS_ONE_ALLOWLIST,
  WEB_EMBED_LOAD_TIMEOUT_MS,
  createEmbedCapabilityNonce,
  createEmbedMessageGate,
  matchesReviewedWebEmbedAllowlist,
} from '../../src/features/doc-engine'

describe('iframe security gate v1', () => {
  it('keeps the accepted iframe capabilities centralized and minimal', () => {
    expect(HTML_EMBED_IFRAME_POLICY).toEqual({
      sandbox: 'allow-scripts',
      referrerPolicy: 'no-referrer',
      allow: '',
      loading: 'lazy',
    })
    expect(HTML_EMBED_IFRAME_POLICY.sandbox).not.toContain('allow-same-origin')
    expect(HTML_EMBED_IFRAME_POLICY.sandbox).not.toMatch(
      /allow-(?:forms|popups|downloads|top-navigation|modals|pointer-lock)/,
    )
    expect(EMBED_CAPABILITY_FRAGMENT_KEY).toBe('nonce')
    expect(HTML_EMBED_READY_TIMEOUT_MS).toBe(4_000)
    expect(WEB_EMBED_LOAD_TIMEOUT_MS).toBe(4_000)
  })

  it('starts empty and matches only reviewed exact eTLD+1 hosts over HTTPS', () => {
    expect(WEB_EMBED_ETLD_PLUS_ONE_ALLOWLIST).toEqual([])
    expect(
      matchesReviewedWebEmbedAllowlist('https://example.com/embed', [
        'example.com',
      ]),
    ).toBe(true)
    expect(
      matchesReviewedWebEmbedAllowlist('http://example.com/embed', [
        'example.com',
      ]),
    ).toBe(false)
    expect(
      matchesReviewedWebEmbedAllowlist('https://sub.example.com/embed', [
        'example.com',
      ]),
    ).toBe(false)
    expect(
      matchesReviewedWebEmbedAllowlist('https://example.com.evil.test/', [
        'example.com',
      ]),
    ).toBe(false)
  })

  it('drops and diagnoses wrong source, nonce replay, and invalid schemas', () => {
    const expectedSource = {}
    const nonce = createEmbedCapabilityNonce()
    const rejections: string[] = []
    const gate = createEmbedMessageGate(expectedSource, nonce, (reason) => {
      rejections.push(reason)
    })

    expect(
      gate.accept({
        source: {},
        data: { nonce, message: { type: 'ready' } },
      }),
    ).toBeUndefined()
    expect(
      gate.accept({
        source: expectedSource,
        data: { nonce: `${nonce}bad`, message: { type: 'ready' } },
      }),
    ).toBeUndefined()
    expect(
      gate.accept({
        source: expectedSource,
        data: { nonce, message: { type: 'ready' } },
      }),
    ).toEqual({ type: 'ready' })
    expect(
      gate.accept({
        source: expectedSource,
        data: { nonce, message: { type: 'ready' } },
      }),
    ).toBeUndefined()
    expect(
      gate.accept({
        source: expectedSource,
        data: { type: 'resize', height: '480' },
      }),
    ).toBeUndefined()
    expect(rejections).toEqual([
      'source-mismatch',
      'authentication-failed',
      'schema-invalid',
      'schema-invalid',
    ])
    expect(
      EMBED_MESSAGE_SCHEMA.safeParse({ type: 'resize', height: 480 }).success,
    ).toBe(true)
  })

  it('keeps the global frame denial and adds only the locked embeds override', () => {
    expect(edgeoneConfig.buildCommand).toBe('pnpm run build')
    const globalRule = edgeoneConfig.headers.find(
      (rule) => rule.source === '/*',
    )
    const embedRule = edgeoneConfig.headers.find(
      (rule) => rule.source === '/embeds/*',
    )
    expect(globalRule?.headers).toContainEqual({
      key: 'X-Frame-Options',
      value: 'DENY',
    })
    expect(embedRule?.headers).toEqual([
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      {
        key: 'Content-Security-Policy',
        value: "frame-ancestors 'self'; sandbox allow-scripts",
      },
    ])
  })
})
