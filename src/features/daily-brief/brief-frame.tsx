'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './daily-brief.module.css'
import type { BriefEntry } from './types'

export const BRIEF_IFRAME_SANDBOX =
  'allow-scripts allow-popups allow-popups-to-escape-sandbox'

/** 超过这个时间还没 `load`，就切到降级卡（同源静态文件通常 <1s） */
const LOAD_TIMEOUT_MS = 6_000

type FrameState = 'loading' | 'ready' | 'failed'

/**
 * 展报纸面：两片折翼覆在 iframe 上，原件 `load` 后以中缝为轴打开并隐去。
 * - iframe 不给 allow-same-origin：Bot 原件自包含、不用存储 / fetch（已核实）；
 * - 外链在原件里是 target=_blank，靠 allow-popups(-to-escape-sandbox) 新开标签；
 * - 不注册全局键盘快捷键，原件自己处理方向键翻页。
 */
export function BriefFrame({ brief }: { brief: BriefEntry }) {
  const frameRef = useRef<HTMLElement | null>(null)
  const [state, setState] = useState<FrameState>('loading')
  const [fullscreen, setFullscreen] = useState(false)
  const [canFullscreen, setCanFullscreen] = useState(false)

  useEffect(() => {
    if (state !== 'loading') return
    const timer = window.setTimeout(() => setState('failed'), LOAD_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [state])

  useEffect(() => {
    const sync = () => {
      setCanFullscreen(typeof document.documentElement.requestFullscreen === 'function')
      setFullscreen(document.fullscreenElement === frameRef.current)
    }
    sync()
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  const toggleFullscreen = async () => {
    const element = frameRef.current
    if (!element) return
    try {
      if (document.fullscreenElement === element) {
        await document.exitFullscreen()
      } else {
        await element.requestFullscreen()
      }
    } catch {
      // 浏览器拒绝全屏（例如 iframe 内、权限策略）时静默忽略
    }
  }

  return (
    <>
      <figure className={styles.frame} data-brief-frame data-state={state} ref={frameRef}>
        <div aria-hidden="true" className={`${styles.flap} ${styles.flapL}`} />
        <div aria-hidden="true" className={`${styles.flap} ${styles.flapR}`}>
          <span className={styles.flapBrand}>折晓早报</span>
        </div>

        <iframe
          className={styles.frameIframe}
          loading="eager"
          onError={() => setState('failed')}
          onLoad={() => setState('ready')}
          referrerPolicy="no-referrer"
          sandbox={BRIEF_IFRAME_SANDBOX}
          src={brief.publicUrl}
          title={brief.title}
        />

        {state === 'failed' && (
          <div className={styles.fallback} data-brief-fallback role="status">
            <p className={styles.kicker}>原件未能在此展开</p>
            <h2 className={styles.fallbackTitle}>{brief.headline}</h2>
            <p className={styles.fallbackText}>
              这份日报没能在纸面里加载完成，可以直接打开原件阅读。
            </p>
            <p>
              <a
                className={styles.action}
                href={brief.publicUrl}
                rel="noreferrer"
                target="_blank"
              >
                打开原件 ↗
              </a>
            </p>
          </div>
        )}
      </figure>

      <p className={styles.readerFoot}>
        {canFullscreen && (
          <button
            aria-pressed={fullscreen}
            className={styles.action}
            data-brief-fullscreen
            onClick={toggleFullscreen}
            type="button"
          >
            {fullscreen ? '退出全屏' : '全屏展报'}
          </button>
        )}
        {brief.genre && <span>{brief.genre}</span>}
        {brief.style && <span>{brief.style}</span>}
        <span>{(brief.bytes / 1024).toFixed(0)} KB · 原件沙箱嵌入</span>
      </p>
    </>
  )
}
