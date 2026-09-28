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
    description: ['服务稳定可靠', 'Reliable service'],
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
        {t('多家顶尖 AI，', 'Leading AI models,')}
        <span className={styles.titleKeep}>{t('轻松使用', 'all in one place')}</span>
      </h1>

      <p className={styles.lead}>
        {t(
          '无需辗转多个平台，一个入口即可使用多家领先 AI 模型。对话内容不做留存，服务稳定、响应迅速。',
          'Use leading AI models from one place, without jumping between platforms. Your conversations are not stored, with reliable service and fast responses.',
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
