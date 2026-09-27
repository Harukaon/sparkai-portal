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

import { PRIMARY_ACTION_LABEL } from '@/app/nav'
import { useNotReady } from '@/shared/hooks/use-not-ready'

import styles from './PitchView.module.css'

interface Highlight {
  icon: ReactNode
  title: string
  description: string
}

/** 三个卖点：标题短、说明具体，不放没有依据的数字 */
const HIGHLIGHTS: Highlight[] = [
  {
    icon: <ThunderboltOutlined />,
    title: '快速接入',
    description: '只需替换 SDK 地址与密钥',
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: '协议兼容',
    description: '支持 OpenAI 与 Anthropic',
  },
  {
    icon: <DollarOutlined />,
    title: '价格透明',
    description: '分组和模型价格可查',
  },
]

/**
 * 首屏左栏：徽章 + 主标题 + 说明 + 两个行动 + 卖点。
 * 产品细节不放在这里 —— 右边一屏已经是价格与计算器了。
 */
export function PitchView() {
  const notReady = useNotReady()
  const authenticated = useAuthStore((state) => state.status === 'authenticated')

  return (
    <div className={styles.copy}>
      <span className={styles.badge}>
        <span className={styles.badgeDot} aria-hidden="true" />
        一个地址，连接全球 AI 能力
      </span>

      <h1 className={styles.title}>
        一个地址，
        <span className={styles.titleKeep}>接上所有主流模型</span>
      </h1>

      <p className={styles.lead}>
        兼容 OpenAI 与 Anthropic 协议。已有的 SDK 只需替换 base_url，配置一个密钥，
        即可在一个地方查看已开放模型的价格、密钥和请求记录。
      </p>

      <div className={styles.actions}>
        <Link to={authenticated ? '/console' : '/register'}>
          <Button type="primary" size="large" icon={<ArrowRightOutlined />} iconPlacement="end">
            {authenticated ? '进入账号' : PRIMARY_ACTION_LABEL}
          </Button>
        </Link>
        <Button
          size="large"
          className={styles.secondary}
          icon={<BookOutlined />}
          onClick={() => notReady('文档')}
        >
          查看文档
        </Button>
      </div>

      <ul className={styles.highlights}>
        {HIGHLIGHTS.map((item) => (
          <li key={item.title} className={styles.highlight}>
            <span className={styles.highlightIcon} aria-hidden="true">
              {item.icon}
            </span>
            <span className={styles.highlightText}>
              <span className={styles.highlightTitle}>{item.title}</span>
              <span className={styles.highlightDesc}>{item.description}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
