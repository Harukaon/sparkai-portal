import { GeoBackdrop } from '@/shared/components/GeoBackdrop'
import { PitchView } from '@/features/landing/components/PitchView'
import { PricePanel } from '@/features/landing/components/PricePanel'
import { StatsBar } from '@/features/landing/components/StatsBar'

import styles from './Hero.module.css'

/**
 * 首页就是一屏，上下两段：
 *   主区（左文案 + 右价格面板）撑满可视高度，底部一条数据带。
 * 刻意不做页面级滚动 —— 访客来这里只要两件事：这站贵不贵、怎么开始用。
 */
export function Hero() {
  return (
    <div className={styles.hero}>
      <div className={styles.stage}>
        <GeoBackdrop />

        <div className={`container ${styles.inner}`}>
          <PitchView />
          <PricePanel />
        </div>
      </div>

      <StatsBar />
    </div>
  )
}
