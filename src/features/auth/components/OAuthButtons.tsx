import { Alert, Button } from 'antd'
import { useState } from 'react'

import { availableOAuthOptions, startOAuthLogin } from '@/features/auth/oauth'
import type { SystemStatus } from '@/features/auth/types'
import { errorMessage } from '@/shared/api/client'

import styles from './OAuthButtons.module.css'

interface OAuthButtonsProps {
  status: SystemStatus
  returnTo: string
  action?: '登录' | '继续'
}

export function OAuthButtons({ status, returnTo, action = '登录' }: OAuthButtonsProps) {
  const [starting, setStarting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const options = availableOAuthOptions(status)
  if (options.length === 0) return null

  async function start(provider: string) {
    setStarting(provider)
    setError(null)
    try {
      const url = await startOAuthLogin(provider, status, returnTo)
      window.location.assign(url)
    } catch (caught: unknown) {
      setError(errorMessage(caught, '第三方登录暂时不可用'))
      setStarting(null)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.separator}><span>或使用其他方式</span></div>
      <div className={styles.options}>
        {options.map((option) => (
          <Button
            key={option.slug}
            block
            loading={starting === option.slug}
            disabled={starting !== null && starting !== option.slug}
            onClick={() => void start(option.slug)}
          >
            使用 {option.name} {action}
          </Button>
        ))}
      </div>
      {error ? <Alert type="error" showIcon title={error} /> : null}
    </div>
  )
}
