import { GlobalOutlined, ThunderboltOutlined, TeamOutlined, CodeSandboxOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'

import { STATS, pickText } from '@/features/landing/data'
import { useLang } from '@/shared/i18n'

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
  const lang = useLang()

  return (
    <div className={styles.bar}>
      <dl className={`container ${styles.inner}`}>
        {STATS.map((stat) => (
          <div key={pickText(stat.value, lang)} className={styles.item}>
            <span className={styles.icon} aria-hidden="true">
              {ICONS[stat.icon]}
            </span>
            <div className={styles.text}>
              <dt className={styles.value}>{pickText(stat.value, lang)}</dt>
              <dd className={styles.label}>{pickText(stat.label, lang)}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  )
}
