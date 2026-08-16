'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { AnnotationPanel } from '@/features/annotations/annotation-panel'
import { SHOW_ANNOTATIONS_PANE_EVENT } from '@/features/annotations/annotation-events'
import {
  ANNOTATE_SELECTION_EVENT,
  isAnnotateSelectionDetail,
} from '@/features/annotations/selection'
import styles from './reader-layout.module.css'

type WorkspacePane = 'comments' | 'annotations' | 'agent'

const TAB_DELAY_MS = 400
const PANE_STORAGE_KEY = 'reader-workspace:pane'

const paneLabels: ReadonlyArray<{ pane: WorkspacePane; label: string }> = [
  { pane: 'comments', label: '评论' },
  { pane: 'annotations', label: '注释' },
  { pane: 'agent', label: 'Agent' },
]

const suggestions = ['解释这一段', '找出论证薄弱处', '生成三句摘要', '出两道自测题'] as const

export function ReaderWorkspace({ articleTitle }: { readonly articleTitle: string }) {
  const [pane, setPane] = useState<WorkspacePane>('annotations')
  const [selectedPane, setSelectedPane] = useState<WorkspacePane>('annotations')
  const [switching, setSwitching] = useState(false)
  const [draft, setDraft] = useState('')
  const [demoNotice, setDemoNotice] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const selectedPaneRef = useRef<WorkspacePane>('annotations')
  const switchingRef = useRef(false)

  useEffect(() => {
    const stored = sessionStorage.getItem(PANE_STORAGE_KEY)
    if (stored !== 'comments' && stored !== 'annotations' && stored !== 'agent') return
    queueMicrotask(() => {
      selectedPaneRef.current = stored
      setPane(stored)
      setSelectedPane(stored)
    })
  }, [])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      switchingRef.current = false
      document.body.classList.remove('reader-right-tabbing')
    },
    [],
  )

  const selectPane = useCallback((nextPane: WorkspacePane) => {
    if (nextPane === selectedPaneRef.current || switchingRef.current) return false
    selectedPaneRef.current = nextPane
    setSelectedPane(nextPane)
    sessionStorage.setItem(PANE_STORAGE_KEY, nextPane)
    const railBusy =
      document.body.classList.contains('reader-right-revealing') ||
      document.body.classList.contains('reader-right-hiding')
    const hidden = document.body.classList.contains('reader-right-collapsed')
    if (
      railBusy ||
      hidden ||
      (matchMedia('(max-width: 1024px)').matches &&
        !document.body.classList.contains('reader-drawer-right')) ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setPane(nextPane)
      return true
    }
    setSwitching(true)
    switchingRef.current = true
    document.body.classList.add('reader-right-tabbing')
    timerRef.current = setTimeout(() => {
      setPane(nextPane)
      setSwitching(false)
      switchingRef.current = false
      document.body.classList.remove('reader-right-tabbing')
    }, TAB_DELAY_MS)
    return true
  }, [])

  useEffect(() => {
    const onAnnotate = (event: Event) => {
      if (!(event instanceof CustomEvent) || !isAnnotateSelectionDetail(event.detail)) {
        return
      }
      selectPane('annotations')
    }
    const onShowAnnotations = () => {
      selectPane('annotations')
    }
    window.addEventListener(ANNOTATE_SELECTION_EVENT, onAnnotate)
    window.addEventListener(SHOW_ANNOTATIONS_PANE_EVENT, onShowAnnotations)
    return () => {
      window.removeEventListener(ANNOTATE_SELECTION_EVENT, onAnnotate)
      window.removeEventListener(SHOW_ANNOTATIONS_PANE_EVENT, onShowAnnotations)
    }
  }, [selectPane])

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | undefined
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % paneLabels.length
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + paneLabels.length) % paneLabels.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = paneLabels.length - 1
    if (nextIndex === undefined) return
    event.preventDefault()
    const nextPane = paneLabels[nextIndex].pane
    if (selectPane(nextPane)) {
      event.currentTarget
        .closest('[role="tablist"]')
        ?.querySelector<HTMLButtonElement>(`[data-workspace-tab="${nextPane}"]`)
        ?.focus()
    }
  }

  const showDemoNotice = () => {
    setDemoNotice('示意模式未发送：Agent 尚未接入任何模型或网络服务。')
  }

  const submitDemo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    showDemoNotice()
  }

  return (
    <div aria-busy={switching} className={styles.workspaceStage} data-reader-workspace>
      <div className={styles.workspaceLive}>
        <header className={styles.workspaceHeader}>
          <div aria-label="工作区页签" className={styles.workspaceTabs} role="tablist">
            {paneLabels.map((item, index) => (
              <button
                aria-controls={`workspace-pane-${item.pane}`}
                aria-selected={selectedPane === item.pane}
                className={styles.workspaceTab}
                data-workspace-tab={item.pane}
                id={`workspace-tab-${item.pane}`}
                key={item.pane}
                onClick={(event) => {
                  if (selectPane(item.pane)) return
                  event.currentTarget
                    .closest('[role="tablist"]')
                    ?.querySelector<HTMLButtonElement>(
                      `[data-workspace-tab="${selectedPaneRef.current}"]`,
                    )
                    ?.focus()
                }}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                onPointerDown={(event) => {
                  if (switching && selectedPane !== item.pane) event.preventDefault()
                }}
                role="tab"
                tabIndex={selectedPane === item.pane ? 0 : -1}
                type="button"
              >
                {item.label}{item.pane === 'comments' ? ' 0' : ''}
              </button>
            ))}
          </div>
          <button
            aria-label="收起工作区"
            className={styles.workspaceCollapse}
            onClick={() => window.dispatchEvent(new Event('reader:workspace-toggle'))}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M15 5l-7 7 7 7" />
              <path d="M20 5l-7 7 7 7" />
            </svg>
          </button>
        </header>

        <section
          aria-labelledby="workspace-tab-comments"
          className={styles.workspacePane}
          hidden={pane !== 'comments'}
          id="workspace-pane-comments"
          role="tabpanel"
        >
          <div className={styles.workspaceCrossReference}>
            这里与页尾评论区共用同一份文章级数据。
          </div>
          <WorkspaceStatus
            detail="P0 只保留真实入口与状态，不提供不可用的输入框。"
            eyebrow="文章级讨论"
            title="评论功能即将开放"
          />
        </section>

        <section
          aria-labelledby="workspace-tab-annotations"
          className={styles.workspacePane}
          data-annotation-panel-slot
          hidden={pane !== 'annotations'}
          id="workspace-pane-annotations"
          role="tabpanel"
        >
          <AnnotationPanel />
        </section>

        <section
          aria-labelledby="workspace-tab-agent"
          className={`${styles.workspacePane} ${styles.agentPane}`}
          hidden={pane !== 'agent'}
          id="workspace-pane-agent"
          role="tabpanel"
        >
          <div className={styles.agentContext}>
            <b>本轮上下文</b>
            文章《{articleTitle}》 · 标题路径 全文 · 选区 <q>未选择</q>
          </div>
          <div className={styles.agentLog}>
            <div className={`${styles.agentMessage} ${styles.agentMessageMine}`}>
              <span>我</span>
              <p>请用一句话解释当前选区。</p>
            </div>
            <div className={styles.agentMessage}>
              <span>分身</span>
              <div>
                <p>这里是用于确认工作区形态的示意回答，尚未接入模型。</p>
                <small>依据：当前文章 › 当前标题路径</small>
              </div>
            </div>
          </div>
          <div className={styles.agentSuggestions} aria-label="建议提问">
            {suggestions.map((suggestion) => (
              <button key={suggestion} onClick={() => setDraft(suggestion)} type="button">
                {suggestion}
              </button>
            ))}
          </div>
          <form className={styles.agentInput} onSubmit={submitDemo}>
            <div>
              <textarea
                aria-label="向电子分身提问"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key !== 'Enter' ||
                    event.shiftKey ||
                    event.nativeEvent.isComposing
                  ) return
                  event.preventDefault()
                  showDemoNotice()
                }}
                placeholder="向电子分身提问…"
                rows={2}
                value={draft}
              />
              <button type="submit">发送</button>
            </div>
            <p>示意外壳：不发出网络请求；未来只传选区、标题路径与文章元数据。</p>
            {demoNotice ? <output className={styles.agentNotice}>{demoNotice}</output> : null}
          </form>
        </section>
      </div>

      <WorkspaceSkeleton pane={selectedPane} switching={switching} />
    </div>
  )
}

function WorkspaceStatus({
  detail,
  eyebrow,
  title,
}: {
  readonly detail: string
  readonly eyebrow: string
  readonly title: string
}) {
  return (
    <div className={styles.workspaceStatus} role="status">
      <span>{eyebrow}</span>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  )
}

function WorkspaceSkeleton({
  pane,
  switching,
}: {
  readonly pane: WorkspacePane
  readonly switching: boolean
}) {
  return (
    <div
      aria-hidden="true"
      className={styles.workspaceSkeleton}
      data-skeleton-pane={pane}
      data-workspace-skeleton
      data-workspace-switching={switching}
    >
      <div className={styles.skeletonTabs}><i /><i /><i /></div>
      {pane === 'agent' ? (
        <div className={styles.skeletonAgent}>
          <b />
          <i /><i /><span><i /><i /><i /></span>
        </div>
      ) : (
        <>
          <div className={styles.skeletonCompose}><i /><i /><i /></div>
          {[0, 1, 2].map((item) => (
            <div className={styles.skeletonCard} key={item}><b /><i /><i /><i /></div>
          ))}
        </>
      )}
    </div>
  )
}
