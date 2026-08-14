'use client'

/**
 * 首页设备门禁（同一 URL，客户端检测，routing.md 五.2 / D12）：
 * - 移动端 → 卡片式板块入口（不加载 3D/GSAP 资源）
 * - reduced-motion → 直接呈现终态（主页本体 + 静态星空，storyboard 无障碍条款）
 * - 其余 → 完整滚动叙事
 */
import dynamic from 'next/dynamic'
import { useIsMobile, usePrefersReducedMotion } from './hooks/use-media'
import { MobileCardEntry } from './mobile-card-entry'
import { EpilogueHome } from './epilogue/epilogue-home'
import { PrologueSplash } from './overlay/prologue-splash'

const JourneyExperience = dynamic(() => import('./journey-experience'), {
  ssr: false,
  loading: () => <PrologueSplash />,
})

export function HomeJourney() {
  const isMobile = useIsMobile()
  const reducedMotion = usePrefersReducedMotion()

  if (isMobile) return <MobileCardEntry />
  if (reducedMotion) return <EpilogueHome staticBackdrop />
  return <JourneyExperience />
}
