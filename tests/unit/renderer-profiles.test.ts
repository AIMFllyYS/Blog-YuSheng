import { describe, expect, it, vi } from 'vitest'

import {
  ARTICLE_PROFILE,
  BUILTIN_RENDERER_REGISTRY,
  CANVAS_SECURITY_POLICY,
  DISCUSSION_LIMITS,
  DISCUSSION_PROFILE,
  DISCUSSION_WRITE_RATE_POLICY,
  DocumentCompilationError,
  EDITOR_PREVIEW_PROFILE,
  EMBED_MESSAGE_SCHEMA,
  HTML_EMBED_IFRAME_POLICY,
  KATEX_SECURITY_POLICY,
  MERMAID_SECURITY_POLICY,
  type SanitizedMermaidImage,
  WEB_EMBED_ETLD_PLUS_ONE_ALLOWLIST,
  compileArticleDocument,
  compileArticleDocumentWithDiagnostics,
  createMermaidWorkerSuccess,
  createEmbedCapabilityNonce,
  createEmbedMessageGate,
  createDisposableBlobUrl,
  discussionWriteRateAllowed,
  isWebEmbedAllowed,
  listCanvasRendererRegistrations,
  profileAllowsRenderer,
  projectRendererNode,
  rendererAllowedForProfile,
  renderMermaidInWorker,
  sanitizeGeneratedMermaidSvg,
  sanitizeDiscussionRead,
  validateCanvasRequest,
  validateArticleLinkUrl,
  validateKatexSource,
  validateMermaidWorkerOutput,
  validateDiscussionWrite,
  validateDocumentUrl,
  validateDiscussionOperationLimits,
} from '../../src/features/doc-engine'

describe('renderer registry and screen profiles', () => {
  it('uses one immutable static registry for builtins and all eight components', () => {
    const definitions = BUILTIN_RENDERER_REGISTRY.list()
    expect(definitions.map((definition) => definition.name)).toEqual([
      'markdown',
      'code',
      'katex',
      'mermaid',
      'image',
      'video-embed',
      'audio-embed',
      'canvas-render',
      'svg-embed',
      'html-embed',
      'web-embed',
      'choice-question',
      'fill-blank-question',
    ])
    expect(listCanvasRendererRegistrations()).toEqual([
      expect.objectContaining({ key: 'function-plot', version: 1 }),
    ])
    expect(
      BUILTIN_RENDERER_REGISTRY.get('video-embed')?.schema.safeParse({
        id: 'demo',
        src: './video.mp4',
        title: '演示',
        unexpected: true,
      }).success,
    ).toBe(false)
    expect(() =>
      BUILTIN_RENDERER_REGISTRY.get('video-embed')?.compile(
        { id: 'demo', src: './video.mp4', title: '演示', unexpected: true },
        { profile: 'article', articleSlug: 'schema' },
      ),
    ).toThrow(/schema/)
  })

  it('does not expose mutable allowlists or nested registry security metadata', () => {
    const beforeDiscussion = profileAllowsRenderer(DISCUSSION_PROFILE, 'image')
    expect(() =>
      (DISCUSSION_PROFILE.rendererAllowlist as string[]).push('image'),
    ).toThrow()
    expect(profileAllowsRenderer(DISCUSSION_PROFILE, 'image')).toBe(beforeDiscussion)

    expect(() =>
      (WEB_EMBED_ETLD_PLUS_ONE_ALLOWLIST as string[]).push('example.com'),
    ).toThrow()
    expect(isWebEmbedAllowed('https://example.com/embed')).toBe(false)

    const image = BUILTIN_RENDERER_REGISTRY.get('image')!
    expect(() => {
      ;(image.allowedProfiles as string[]).push('discussion')
    }).toThrow()
    expect(() => {
      ;(image.security as { allowsScript: boolean }).allowsScript = true
    }).toThrow()
    expect(image.security.allowsScript).toBe(false)
  })

  it('allows the full registry for article, keeps editor preview diagnostic-only, and centralizes discussion permissions', () => {
    expect(ARTICLE_PROFILE.rendererAllowlist).toBe('registry')
    expect(EDITOR_PREVIEW_PROFILE.rendererAllowlist).toBe('registry')
    expect(EDITOR_PREVIEW_PROFILE.diagnosticMode).toBe('inline-diagnostics')
    expect(profileAllowsRenderer(DISCUSSION_PROFILE, 'markdown')).toBe(true)
    expect(profileAllowsRenderer(DISCUSSION_PROFILE, 'image')).toBe(false)

    const image = BUILTIN_RENDERER_REGISTRY.get('image')!
    expect(rendererAllowedForProfile(image, ARTICLE_PROFILE)).toBe(true)
    expect(
      rendererAllowedForProfile(
        { ...image, discussionCandidate: true, allowedProfiles: ['discussion'] },
        DISCUSSION_PROFILE,
      ),
    ).toBe(false)
  })

  it('uses an explicit fallback when a requested export projection is absent', async () => {
    const write = await validateDiscussionWrite({
      entryId: 'projection',
      source: 'Fallback text.',
    })
    expect(write.accepted).toBe(true)
    if (!write.accepted) return
    const definition = BUILTIN_RENDERER_REGISTRY.get('markdown')!
    const projection = projectRendererNode(
      definition,
      'docx',
      write.document.root.children[0]!,
    )
    expect(projection.usedFallback).toBe(true)
    expect(projection.value).toMatchObject({ kind: 'renderer-fallback' })
  })
})

describe('central security configuration', () => {
  it('locks the accepted iframe policy and starts with an empty web allowlist', () => {
    expect(HTML_EMBED_IFRAME_POLICY).toEqual({
      sandbox: 'allow-scripts',
      referrerPolicy: 'no-referrer',
      allow: '',
      loading: 'lazy',
    })
    expect(HTML_EMBED_IFRAME_POLICY.sandbox).not.toContain('allow-same-origin')
    expect(WEB_EMBED_ETLD_PLUS_ONE_ALLOWLIST.length).toBe(0)
    expect(isWebEmbedAllowed('https://example.com/embed')).toBe(false)
    expect(isWebEmbedAllowed('http://example.com/embed')).toBe(false)
    expect(isWebEmbedAllowed('https://sub.example.com/embed')).toBe(false)
  })

  it('authenticates postMessage by source and one-time nonce before accepting the strict schema', () => {
    const expectedSource = {}
    const nonce = createEmbedCapabilityNonce()
    const gate = createEmbedMessageGate(expectedSource, nonce, vi.fn())
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
    expect(gate.authenticated).toBe(true)
    expect(
      gate.accept({
        source: expectedSource,
        data: { nonce, message: { type: 'ready' } },
      }),
    ).toBeUndefined()
    expect(
      gate.accept({ source: expectedSource, data: { type: 'resize', height: 480 } }),
    ).toEqual({ type: 'resize', height: 480 })
    expect(
      gate.accept({
        source: expectedSource,
        data: { type: 'resize', height: 480, extra: true },
      }),
    ).toBeUndefined()
    expect(EMBED_MESSAGE_SCHEMA.safeParse({ type: 'unknown' }).success).toBe(false)
  })

  it('accepts only HTTPS, mailto, and safe page anchors', () => {
    expect(validateDocumentUrl('https://example.com/path')?.kind).toBe('https')
    expect(validateDocumentUrl('mailto:reader@example.com')?.kind).toBe('mailto')
    expect(validateDocumentUrl('#章节-1')?.kind).toBe('anchor')
    for (const unsafe of [
      'http://example.com',
      'javascript:alert(1)',
      'data:text/html,boom',
      'file:///tmp/a',
      'vbscript:msgbox(1)',
      '//example.com/path',
      'https://user:secret@example.com/',
      'mailto://evil.example/x',
      'mailto:a@example.com?subject=x%0D%0ABcc:evil@example.com',
      'mailto:a@example.com?subject=x%250d%250aBcc:evil@example.com',
      'mailto:a@example.com?bcc=evil@example.com',
    ]) {
      expect(validateDocumentUrl(unsafe), unsafe).toBeUndefined()
    }
  })

  it('keeps the golden article same-site link exception narrow and canonical', () => {
    expect(validateArticleLinkUrl('/blog/')).toBe(true)
    expect(validateArticleLinkUrl('/%252e%252e/secret')).toBe(false)
    expect(validateArticleLinkUrl('/blog/%250Aevil')).toBe(false)
    expect(validateArticleLinkUrl('//evil.example/path')).toBe(false)
  })

  it('keeps every locked v1 resource limit in one executable table', () => {
    expect(DISCUSSION_LIMITS).toMatchObject({
      maxSourceLength: 10_000,
      maxMermaidSourceLength: 5_000,
      maxMermaidInstances: 3,
      maxSafeCanvasInstances: 3,
      maxFormulaInstances: 50,
      maxContainerNestingDepth: 6,
      maxTableRows: 50,
      maxTableColumns: 20,
      maxCodeBlockSourceLength: 8_000,
      maxReplyDepth: 5,
      pageSize: 50,
      maxExportEntries: 500,
      maxExportSourceBytes: 5 * 1024 * 1024,
    })
  })

  it('publishes executable KaTeX, Mermaid, Canvas, operation, and rate guards', async () => {
    expect(KATEX_SECURITY_POLICY).toMatchObject({
      trust: false,
      strict: 'error',
      allowUserMacros: false,
    })
    expect(
      validateKatexSource(
        `${'{'.repeat(KATEX_SECURITY_POLICY.maxNestingDepth + 1)}x${'}'.repeat(KATEX_SECURITY_POLICY.maxNestingDepth + 1)}`,
      ),
    ).toMatch(/嵌套/)
    expect(MERMAID_SECURITY_POLICY).toMatchObject({
      securityLevel: 'strict',
      allowUserClick: false,
      allowExternalLinks: false,
      sanitizeGeneratedSvg: true,
      delivery: 'blob-image',
    })
    expect(validateCanvasRequest({ width: CANVAS_SECURITY_POLICY.maxWidth + 1, height: 1 })).toMatch(/Canvas/)
    expect(
      validateDiscussionOperationLimits({
        replyDepth: DISCUSSION_LIMITS.maxReplyDepth + 1,
        pageSize: DISCUSSION_LIMITS.pageSize + 1,
        exportEntries: DISCUSSION_LIMITS.maxExportEntries + 1,
        exportSourceBytes: DISCUSSION_LIMITS.maxExportSourceBytes + 1,
      }),
    ).toHaveLength(4)
    expect(
      discussionWriteRateAllowed({
        accountWritesInWindow: DISCUSSION_WRITE_RATE_POLICY.maxWritesPerAccount,
        articleWritesInWindow: 0,
      }),
    ).toBe(false)

    expect(() =>
      sanitizeGeneratedMermaidSvg(
        '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" /></svg>',
      ),
    ).toThrow(/浏览器/)
    expect(
      validateMermaidWorkerOutput(
        `<svg><path d="${'x'.repeat(MERMAID_SECURITY_POLICY.maxAttributeLength)}" /></svg>`,
      ),
    ).toMatch(/属性/)
    expect(
      validateMermaidWorkerOutput(
        `<svg><text>${'x'.repeat(MERMAID_SECURITY_POLICY.maxTextLength + 1)}</text></svg>`,
      ),
    ).toMatch(/文本/)
    expect(
      validateMermaidWorkerOutput(
        '界'.repeat(Math.ceil(MERMAID_SECURITY_POLICY.maxOutputBytes / 3) + 1),
      ),
    ).toMatch(/字节/)
    expect(() =>
      createMermaidWorkerSuccess(
        `<svg><text>${'x'.repeat(MERMAID_SECURITY_POLICY.maxTextLength + 1)}</text></svg>`,
      ),
    ).toThrow(/文本/)

    vi.useFakeTimers()
    try {
      let terminated = false
      let lateSideEffect = false
      let lateTimer: ReturnType<typeof setTimeout> | undefined
      const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>()
      const worker = {
        addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
          const current = listeners.get(type) ?? new Set()
          current.add(listener)
          listeners.set(type, current)
        },
        removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
          listeners.get(type)?.delete(listener)
        },
        postMessage() {
          lateTimer = setTimeout(() => {
            if (!terminated) lateSideEffect = true
          }, MERMAID_SECURITY_POLICY.renderTimeoutMs + 100)
        },
        terminate() {
          terminated = true
          if (lateTimer !== undefined) clearTimeout(lateTimer)
        },
      } as unknown as Parameters<typeof renderMermaidInWorker>[0]
      const timedOut = renderMermaidInWorker(worker, { source: 'graph TD' })
      const timeoutExpectation = expect(timedOut).rejects.toThrow(/超时/)
      await vi.advanceTimersByTimeAsync(MERMAID_SECURITY_POLICY.renderTimeoutMs)
      await timeoutExpectation
      expect(terminated).toBe(true)
      await vi.advanceTimersByTimeAsync(1_000)
      expect(lateSideEffect).toBe(false)
    } finally {
      vi.useRealTimers()
    }

    let invalidTerminated = false
    let messageListener: ((event: MessageEvent<unknown>) => void) | undefined
    const invalidWorker = {
      addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        if (type === 'message' && typeof listener === 'function') {
          messageListener = listener as (event: MessageEvent<unknown>) => void
        }
      },
      removeEventListener() {},
      postMessage() {
        messageListener?.({ data: { ok: true, svg: {} } } as MessageEvent<unknown>)
      },
      terminate() {
        invalidTerminated = true
      },
    } as unknown as Parameters<typeof renderMermaidInWorker>[0]
    await expect(renderMermaidInWorker(invalidWorker, {})).rejects.toThrow(/无效消息/)
    expect(invalidTerminated).toBe(true)

    let cloneFailureTerminated = false
    const cloneFailureWorker = {
      addEventListener() {},
      removeEventListener() {},
      postMessage() {
        throw new DOMException('cannot clone', 'DataCloneError')
      },
      terminate() {
        cloneFailureTerminated = true
      },
    } as unknown as Parameters<typeof renderMermaidInWorker>[0]
    await expect(renderMermaidInWorker(cloneFailureWorker, () => undefined)).rejects.toThrow(/初始化/)
    expect(cloneFailureTerminated).toBe(true)

    expect(validateCanvasRequest({ width: 10, height: 10, executionTimeMs: Number.NaN })).toMatch(/执行时间/)
    expect(validateCanvasRequest({ width: 10, height: 10, executionTimeMs: -1 })).toMatch(/执行时间/)
    expect(validateDiscussionOperationLimits({ replyDepth: -1 })).toHaveLength(1)
    expect(validateDiscussionOperationLimits({ pageSize: 1.5 })).toHaveLength(1)
    expect(
      discussionWriteRateAllowed({
        accountWritesInWindow: -1,
        articleWritesInWindow: Number.NaN,
      }),
    ).toBe(false)

    type MermaidAssetExposesSvg = SanitizedMermaidImage extends {
      readonly svg: unknown
    }
      ? true
      : false
    const mermaidAssetExposesSvg: MermaidAssetExposesSvg = false
    expect(mermaidAssetExposesSvg).toBe(false)

    const createObjectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:mermaid-old')
      .mockReturnValueOnce('blob:mermaid-new')
      .mockReturnValueOnce('blob:mermaid-error')
    const revokeObjectUrl = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined)
    try {
      const oldHandle = createDisposableBlobUrl(new Blob(['old']))
      const newHandle = createDisposableBlobUrl(new Blob(['new']))
      oldHandle.dispose()
      oldHandle.dispose()
      expect(oldHandle.disposed).toBe(true)
      newHandle.dispose()

      const errorHandle = createDisposableBlobUrl(new Blob(['error']))
      try {
        throw new Error('renderer failed')
      } catch {
        errorHandle.dispose()
      }
      expect(revokeObjectUrl.mock.calls).toEqual([
        ['blob:mermaid-old'],
        ['blob:mermaid-new'],
        ['blob:mermaid-error'],
      ])
      expect(createObjectUrl).toHaveBeenCalledTimes(3)
    } finally {
      createObjectUrl.mockRestore()
      revokeObjectUrl.mockRestore()
    }
  })
})

describe('article profile security integration', () => {
  it.each([
    ['dangerous link', '[x](javascript:alert(1))'],
    ['plain HTTP link', '[x](http://example.com)'],
    [
      'encoded traversal asset',
      '<video-embed id="bad-video" src="./media/%252e%252e/secret.mp4" title="bad" />',
    ],
    [
      'encoded newline asset',
      '<video-embed id="bad-control" src="./media/safe%250Aevil.mp4" title="bad" />',
    ],
    [
      'unregistered Canvas renderer',
      '<canvas-render id="bad-canvas" renderer="evil-loader" width="100" height="100" />',
    ],
    [
      'dangerous web embed URL',
      `<web-embed id="bad-web" src="javascript:alert(1)" title="bad">
fallback
</web-embed>`,
    ],
  ])('blocks %s in the real article compiler', async (_name, source) => {
    await expect(
      compileArticleDocument({ articleSlug: 'unsafe-article', source, frontmatter: {} }),
    ).rejects.toBeInstanceOf(DocumentCompilationError)
  })

  it('reports dangerous article URLs through the article security diagnostic', async () => {
    const result = await compileArticleDocumentWithDiagnostics({
      articleSlug: 'article-diagnostic',
      source: '[x](javascript:alert(1))',
      frontmatter: {},
    })
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'DOC-SECURITY-005',
        phase: 'article-build',
        buildBlocking: true,
      }),
    ])
  })

  it('emits an explicit fallback warning for an HTTPS web embed outside the empty allowlist', async () => {
    const source = `<web-embed id="preview" src="https://example.com/embed" title="preview">
fallback
</web-embed>`
    const result = await compileArticleDocumentWithDiagnostics({
      articleSlug: 'web-fallback',
      source,
      frontmatter: {},
    })
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'DOC-SECURITY-006',
        severity: 'warning',
        disposition: 'continue-with-fallback',
      }),
    ])
    await expect(
      compileArticleDocument({ articleSlug: 'web-fallback', source, frontmatter: {} }),
    ).resolves.toMatchObject({ articleSlug: 'web-fallback' })
  })
})

describe('discussion write/read security pipeline', () => {
  it('stores valid raw Markdown and revalidates it before final sanitize', async () => {
    const source =
      '[安全链接](https://example.com/path) [邮件](mailto:reader@example.com) [章节](#part)\n\n`code` and $E=mc^2$.'
    const write = await validateDiscussionWrite({ entryId: 'safe', source })
    expect(write.accepted).toBe(true)
    if (!write.accepted) return
    expect(write.rawSource).toBe(source)

    const read = await sanitizeDiscussionRead({ entryId: 'safe', source })
    expect(read.safe).toBe(true)
    if (!read.safe) return
    expect(read.rawSource).toBe(source)
    expect(read.sanitizedHtml).toContain(
      'rel="nofollow ugc noopener noreferrer"',
    )
    expect(read.sanitizedHtml).not.toMatch(/<script|onclick=|javascript:/i)
  })

  it.each([
    ['script', '<script>alert(1)</script>'],
    ['event attribute', '<span onclick="alert(1)">boom</span>'],
    ['javascript URL', '[boom](javascript:alert(1))'],
    ['http URL', '[plain](http://example.com)'],
    ['image', '![tracking](https://example.com/pixel.png)'],
    [
      'mailto header injection',
      '[mail](mailto:a@example.com?subject=x%0D%0ABcc:evil@example.com)',
    ],
    [
      'Mermaid click directive',
      '```mermaid\ngraph TD\nclick A href "https://evil.example"\n```',
    ],
    ['KaTeX macro definition', '$\\def\\boom{boom}\\boom$'],
  ])('rejects malicious %s at write and safely degrades it at read', async (_name, source) => {
    const write = await validateDiscussionWrite({ entryId: 'malicious', source })
    expect(write.accepted).toBe(false)
    if (write.accepted) return
    expect(write.diagnostics.every((item) => item.phase === 'discussion-write')).toBe(true)
    expect(write.diagnostics.every((item) => item.disposition === 'reject-entry')).toBe(true)

    const read = await sanitizeDiscussionRead({ entryId: 'malicious', source })
    expect(read.safe).toBe(false)
    if (read.safe) return
    expect(read.sanitizedHtml).toContain('data-discussion-fallback="security"')
    expect(read.sanitizedHtml).not.toContain(source)
    expect(read.diagnostics.every((item) => item.phase === 'discussion-read')).toBe(true)
    expect(read.diagnostics.every((item) => item.disposition === 'safe-fallback')).toBe(true)
  })

  it('rejects over-limit source and code without affecting article-build diagnostics', async () => {
    const sourceTooLong = '字'.repeat(DISCUSSION_LIMITS.maxSourceLength + 1)
    const sourceResult = await validateDiscussionWrite({
      entryId: 'too-long',
      source: sourceTooLong,
    })
    expect(sourceResult.accepted).toBe(false)
    if (!sourceResult.accepted) {
      expect(sourceResult.diagnostics.some((item) => item.code === 'DOC-SECURITY-003')).toBe(true)
      expect(sourceResult.diagnostics.some((item) => item.buildBlocking)).toBe(false)
    }

    const codeSource = `\`\`\`text\n${'x'.repeat(DISCUSSION_LIMITS.maxCodeBlockSourceLength + 1)}\n\`\`\``
    const codeResult = await validateDiscussionWrite({
      entryId: 'code-limit',
      source: codeSource,
    })
    expect(codeResult.accepted).toBe(false)
    if (!codeResult.accepted) {
      expect(codeResult.diagnostics.some((item) => item.message.includes('单代码块'))).toBe(true)
    }
  })

  it('accepts a discussion at the exact source limit without recursive alignment failure', async () => {
    const result = await validateDiscussionWrite({
      entryId: 'at-limit',
      source: '字'.repeat(DISCUSSION_LIMITS.maxSourceLength),
    })
    expect(result.accepted).toBe(true)
  })

  it('rejects deeply nested containers as one discussion entry', async () => {
    const result = await validateDiscussionWrite({
      entryId: 'deep-containers',
      source: `${'> '.repeat(1_000)}deep`,
    })
    expect(result.accepted).toBe(false)
    if (!result.accepted) {
      expect(result.diagnostics.some((item) => item.message.includes('嵌套'))).toBe(true)
    }
  })
})
