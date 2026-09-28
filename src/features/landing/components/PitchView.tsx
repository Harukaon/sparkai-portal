import {
  ArrowRightOutlined,
  BookOutlined,
  EyeInvisibleOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Button } from 'antd'
import { useAuthStore } from '@/features/auth/auth-store'
import { useT } from '@/shared/i18n'

import { PRIMARY_ACTION_LABEL } from '@/app/nav'

import styles from './PitchView.module.css'

interface Highlight {
  icon: ReactNode
  /** [中文, 英文] */
  title: [string, string]
  description: [string, string]
}

/** 三个卖点：零数据保留排第一，其次稳定、快速。面向普通用户说话，不堆技术名词 */
const HIGHLIGHTS: Highlight[] = [
  {
    icon: <EyeInvisibleOutlined />,
    title: ['零数据保留', 'Zero data retention'],
    description: ['请求内容用完即弃，不存一条', 'Your requests are never stored'],
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: ['稳定可靠', 'Rock-solid'],
    description: ['多线路保障，服务不掉线', 'Redundant routes, always on'],
  },
  {
    icon: <ThunderboltOutlined />,
    title: ['快速响应', 'Fast responses'],
    description: ['低延迟直连，回答即刻送达', 'Low latency, answers arrive fast'],
  },
]

/**
 * 首屏左栏：徽章 + 主标题 + 说明 + 两个行动 + 卖点。
 * 产品细节不放在这里 —— 右边一屏已经是价格与计算器了。
 */
export function PitchView() {
  const t = useT()
  const authenticated = useAuthStore((state) => state.status === 'authenticated')

  return (
    <div className={styles.copy}>
      <span className={styles.badge}>
        <span className={styles.badgeDot} aria-hidden="true" />
        {t('零数据保留 · 稳定 · 快速', 'Zero data retention · Stable · Fast')}
      </span>

      <h1 className={styles.title}>
        {t('一个地址，', 'One address,')}
        <span className={styles.titleKeep}>{t('用上各家旗舰模型', 'every flagship model')}</span>
      </h1>

      <p className={styles.lead}>
        {t(
          '你的对话只属于你：我们不保留任何请求内容，用完即弃。一个接入地址，各家旗舰模型随你切换，稳定不掉线，响应快人一步。',
          'Your conversations stay yours: we never keep what you send. One address gives you every flagship model — stable, always on, and fast.',
        )}
      </p>

      <div className={styles.actions}>
        <Link to={authenticated ? '/console' : '/register'}>
          <Button type="primary" size="large" icon={<ArrowRightOutlined />} iconPlacement="end">
            {authenticated ? t('进入账号', 'Open console') : t(...PRIMARY_ACTION_LABEL)}
          </Button>
        </Link>
        <Link to="/quickstart">
          <Button size="large" className={styles.secondary} icon={<BookOutlined />}>
            {t('接入教程', 'Quick Start')}
          </Button>
        </Link>
      </div>

      <ul className={styles.highlights}>
        {HIGHLIGHTS.map((item) => (
          <li key={item.title[0]} className={styles.highlight}>
            <span className={styles.highlightIcon} aria-hidden="true">
              {item.icon}
            </span>
            <span className={styles.highlightText}>
              <span className={styles.highlightTitle}>{t(...item.title)}</span>
              <span className={styles.highlightDesc}>{t(...item.description)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
