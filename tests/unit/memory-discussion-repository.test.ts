import { describe, expect, it } from 'vitest'

import type { TextAnchor } from '../../src/features/annotations/anchors'
import {
  createFakeAuthPort,
  createMemoryDiscussionRepository,
} from '../../src/features/discussions'

const anchor: TextAnchor = {
  protocolVersion: 1,
  articleSlug: 'p0-kitchen-sink',
  documentFingerprint: '22f4fb117829eed5b793eb88c91cf444274c92c99226e5d13452b69ee68cbaaa',
  startBlockId: 'block-paragraph-b9a4cffa8f0fcabe',
  startOffset: 4,
  endBlockId: 'block-paragraph-b9a4cffa8f0fcabe',
  endOffset: 16,
  exact: '只包含合法内容的黄金文章',
  prefix: '这是一篇',
  suffix: '。它同时验证中文、English、inline code、站内链',
  headingPath: ['p0-中文综合验收文章'],
}

describe('memory discussion repository', () => {
  it('creates an annotation thread atomically and rejects anonymous or closed writes', async () => {
    const open = createMemoryDiscussionRepository({ writesOpen: true })
    const closed = createMemoryDiscussionRepository({ writesOpen: false })
    const member = createFakeAuthPort('member').getCurrentUser()

    const created = await open.createAnnotationThread({
      articleSlug: 'p0-kitchen-sink',
      anchor,
      source: '这段把协议说清楚了。',
      user: member,
    })
    expect(created.ok).toBe(true)
    if (created.ok) {
      expect(created.value.thread.kind).toBe('annotation')
      expect(created.value.entries).toHaveLength(1)
      expect(created.value.entries[0]?.parentId).toBeNull()
    }

    const anon = await open.createAnnotationThread({
      articleSlug: 'p0-kitchen-sink',
      anchor,
      source: '匿名留言',
      user: null,
    })
    expect(anon).toMatchObject({ ok: false, code: 'UNAUTHENTICATED' })

    const blocked = await closed.createAnnotationThread({
      articleSlug: 'p0-kitchen-sink',
      anchor,
      source: '生产环境不该写下',
      user: member,
    })
    expect(blocked).toMatchObject({ ok: false, code: 'WRITES_CLOSED' })
  })

  it('rejects malicious source and enforces reply depth plus cascade delete', async () => {
    const repo = createMemoryDiscussionRepository({ writesOpen: true })
    const member = createFakeAuthPort('member').getCurrentUser()
    const author = createFakeAuthPort('author').getCurrentUser()

    const malicious = await repo.createAnnotationThread({
      articleSlug: 'p0-kitchen-sink',
      anchor,
      source: '<script>alert(1)</script>',
      user: member,
    })
    expect(malicious).toMatchObject({ ok: false, code: 'INVALID_SOURCE' })

    const root = await repo.createAnnotationThread({
      articleSlug: 'p0-kitchen-sink',
      anchor,
      source: '根注释',
      user: member,
    })
    expect(root.ok).toBe(true)
    if (!root.ok) return

    let parentId = root.value.entries[0]!.id
    for (let level = 2; level <= 5; level += 1) {
      const reply = await repo.reply({
        threadId: root.value.thread.id,
        parentId,
        source: `第 ${level} 层`,
        user: member,
      })
      expect(reply.ok).toBe(true)
      if (!reply.ok) return
      parentId = reply.value.id
    }
    const overflow = await repo.reply({
      threadId: root.value.thread.id,
      parentId,
      source: '第六层',
      user: member,
    })
    expect(overflow).toMatchObject({ ok: false, code: 'MAX_DEPTH' })

    const editOthers = await repo.editEntry({
      entryId: root.value.entries[0]!.id,
      source: '作者改别人的字',
      user: author,
    })
    expect(editOthers).toMatchObject({ ok: false, code: 'FORBIDDEN' })

    const deleted = await repo.deleteEntry({
      entryId: root.value.entries[0]!.id,
      user: author,
    })
    expect(deleted.ok).toBe(true)
    if (deleted.ok) expect(deleted.value.deletedIds.length).toBeGreaterThan(1)
    const remaining = await repo.listAnnotationThreads('p0-kitchen-sink')
    expect(remaining).toHaveLength(0)
  })
})
