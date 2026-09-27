import { GlobalOutlined, ThunderboltOutlined, TeamOutlined, CodeSandboxOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'

import { STATS } from '@/features/landing/data'

import styles from './StatsBar.module.css'

const ICONS: Record<string, ReactNode> = {
  users: <TeamOutlined />,
  cube: <CodeSandboxOutlined />,
  bolt: <ThunderboltOutlined />,
  globe: <GlobalOutlined />,
}

/**
 * 底部数据带。
 *
 * 这里只展示已实现的产品能力，不显示未经核实的经营数字。
 */
export function StatsBar() {
  return (
    <div className={styles.bar}>
      <dl className={`container ${styles.inner}`}>
        {STATS.map((stat) => (
          <div key={stat.value} className={styles.item}>
            <span className={styles.icon} aria-hidden="true">
              {ICONS[stat.icon]}
            </span>
            <div className={styles.text}>
              <dt className={styles.value}>{stat.value}</dt>
              <dd className={styles.label}>{stat.label}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  )
}
