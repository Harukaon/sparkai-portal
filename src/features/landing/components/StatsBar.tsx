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
 * ⚠️ 「10,000+ 开发者的选择」「99.9% 服务可用性」是对外的承诺，
 * 上线前必须确认能兑现；拿不准就删掉 data.ts 里对应条目，这里会自动少一格。
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
