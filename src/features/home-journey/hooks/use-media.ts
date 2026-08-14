'use client'

/**
 * 环境检测 hooks（客户端）：
 * - 移动端判定走「视口/指针类型」（frontend-design 第五节、routing.md 五.2）
 * - prefers-reduced-motion 全站尊重（frontend-design 3.3）
 */
import { useSyncExternalStore } from 'react'

function subscribe(query: string) {
  return (onChange: () => void): (() => void) => {
    const mql = window.matchMedia(query)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }
}

function makeSnapshot(query: string) {
  return (): boolean => window.matchMedia(query).matches
}

const getServerSnapshot = (): boolean => false

/** 粗指针或窄视口即视为移动端（D12：不加载 3D 资源，渲染卡片入口） */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe('(pointer: coarse), (max-width: 767px)'),
    makeSnapshot('(pointer: coarse), (max-width: 767px)'),
    getServerSnapshot,
  )
}

/** reduced-motion：直接呈现终态，不进滚动叙事 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe('(prefers-reduced-motion: reduce)'),
    makeSnapshot('(prefers-reduced-motion: reduce)'),
    getServerSnapshot,
  )
}
