import { HomeJourney } from '@/features/home-journey'

/**
 * 首页（路由层只做组合，routing.md 五.1）：
 * 桌面端 3D 滚动叙事 / 移动端卡片入口 / reduced-motion 终态，全部下沉在 feature 内。
 */
export default function HomePage() {
  return <HomeJourney />
}
