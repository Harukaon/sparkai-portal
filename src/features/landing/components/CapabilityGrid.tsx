import { CAPABILITIES } from '@/features/landing/data'

import styles from './CapabilityGrid.module.css'

/** 四个卖点：两条一列，靠细线分隔，不用卡片堆叠 */
export function CapabilityGrid() {
  return (
    <ul className={styles.grid}>
      {CAPABILITIES.map((item) => (
        <li key={item.title} className={styles.item}>
          <h3 className={styles.itemTitle}>{item.title}</h3>
          <p className={styles.itemDetail}>{item.detail}</p>
        </li>
      ))}
    </ul>
  )
}
