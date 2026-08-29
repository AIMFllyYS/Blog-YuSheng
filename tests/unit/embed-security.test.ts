import { describe, expect, it } from 'vitest'

import edgeoneConfig from '../../edgeone.json'
import {
  EMBED_CAPABILITY_FRAGMENT_KEY,
  EMBED_MESSAGE_SCHEMA,
  HTML_EMBED_IFRAME_POLICY,
  HTML_EMBED_READY_TIMEOUT_MS,
  AUTHOR_HOSTED_ETLD_PLUS_ONE_ALLOWLIST,
  WEB_EMBED_ETLD_PLUS_ONE_ALLOWLIST,
  WEB_EMBED_EXTRA_ETLD_PLUS_ONE_ALLOWLIST,
  WEB_EMBED_LOAD_TIMEOUT_MS,
  createEmbedCapabilityNonce,
  createEmbedMessageGate,
  isAuthorHostedImageUrl,
  isAuthorHostedVideoUrl,
  isRegistrableEtldPlusOne,
  isWebEmbedAllowed,
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

  it('matches reviewed eTLD+1 hosts and their subdomains over HTTPS', () => {
    expect(AUTHOR_HOSTED_ETLD_PLUS_ONE_ALLOWLIST).toEqual([
      'husteread.com',
      'husteread.icu',
      '1037solo.com',
      '1037solo.cn',
      'yusheng.email',
    ])
    expect(WEB_EMBED_EXTRA_ETLD_PLUS_ONE_ALLOWLIST).toEqual([
      'harvey.ai',
      'themodernsoftware.dev',
      'datalearner.com',
    ])
    expect(WEB_EMBED_ETLD_PLUS_ONE_ALLOWLIST).toEqual([
      ...AUTHOR_HOSTED_ETLD_PLUS_ONE_ALLOWLIST,
      ...WEB_EMBED_EXTRA_ETLD_PLUS_ONE_ALLOWLIST,
    ])
    expect(isWebEmbedAllowed('https://read.husteread.com/')).toBe(true)
    expect(isWebEmbedAllowed('https://platform.1037solo.com/')).toBe(true)
    expect(isWebEmbedAllowed('https://www.harvey.ai/blog/post')).toBe(true)
    expect(isWebEmbedAllowed('https://example.com/embed')).toBe(false)
    expect(
      matchesReviewedWebEmbedAllowlist('https://example.com/embed', [
        'example.com',
      ]),
    ).toBe(true)
    expect(
      matchesReviewedWebEmbedAllowlist('https://sub.example.com/embed', [
        'example.com',
      ]),
    ).toBe(true)
    expect(
      matchesReviewedWebEmbedAllowlist('http://example.com/embed', [
        'example.com',
      ]),
    ).toBe(false)
    expect(
      matchesReviewedWebEmbedAllowlist('https://example.com.evil.test/', [
        'example.com',
      ]),
    ).toBe(false)
    expect(
      matchesReviewedWebEmbedAllowlist('https://evilhusteread.com/', [
        'husteread.com',
      ]),
    ).toBe(false)
    expect(
      matchesReviewedWebEmbedAllowlist('https://example.com/embed', ['com']),
    ).toBe(false)
    expect(isRegistrableEtldPlusOne('com')).toBe(false)
    expect(isRegistrableEtldPlusOne('husteread.com')).toBe(true)
    expect(
      isAuthorHostedImageUrl(
        'https://husteread.com/storage/public/files/blog/demo/cover.webp',
      ),
    ).toBe(true)
    expect(
      isAuthorHostedVideoUrl(
        'https://husteread.com/storage/public/files/blog/demo/clip.mp4',
      ),
    ).toBe(true)
    expect(
      isAuthorHostedImageUrl('https://www.harvey.ai/cover.webp'),
    ).toBe(false)
    expect(
      isAuthorHostedImageUrl('https://example.com/photo.png'),
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
