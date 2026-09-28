import {
  ArrowRightOutlined,
  BookOutlined,
  DollarOutlined,
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

/** 三个卖点：标题短、说明具体，不放没有依据的数字 */
const HIGHLIGHTS: Highlight[] = [
  {
    icon: <ThunderboltOutlined />,
    title: ['快速接入', 'Quick to integrate'],
    description: ['只需替换 SDK 地址与密钥', 'Swap the base URL and key'],
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: ['协议兼容', 'Protocol compatible'],
    description: ['支持 OpenAI 与 Anthropic', 'OpenAI and Anthropic protocols'],
  },
  {
    icon: <DollarOutlined />,
    title: ['价格透明', 'Transparent pricing'],
    description: ['分组和模型价格可查', 'Per-group, per-model prices'],
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
        {t('一个地址，连接全球 AI 能力', 'One endpoint to all major AI models')}
      </span>

      <h1 className={styles.title}>
        {t('一个地址，', 'One endpoint,')}
        <span className={styles.titleKeep}>{t('接上所有主流模型', 'every major model')}</span>
      </h1>

      <p className={styles.lead}>
        {t(
          '兼容 OpenAI 与 Anthropic 协议。已有的 SDK 只需替换 base_url，配置一个密钥，即可在一个地方查看已开放模型的价格、密钥和请求记录。',
          'Works with OpenAI and Anthropic protocols. Point your existing SDK at our base URL, add one key, and manage model prices, API keys, and request logs in one place.',
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
