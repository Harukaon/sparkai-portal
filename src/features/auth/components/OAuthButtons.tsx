import { GithubOutlined, DiscordOutlined, SafetyCertificateOutlined, SendOutlined, LoginOutlined } from '@ant-design/icons'
import { Alert, Button } from 'antd'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { availableOAuthOptions, startOAuthLogin } from '@/features/auth/oauth'
import type { SystemStatus } from '@/features/auth/types'
import { errorMessage } from '@/shared/api/client'
import { useT } from '@/shared/i18n'

const ICONS: Record<string, ReactNode> = {
  github: <GithubOutlined />,
  discord: <DiscordOutlined />,
  oidc: <SafetyCertificateOutlined />,
  telegram: <SendOutlined />,
}

interface OAuthButtonsProps {
  status: SystemStatus
  returnTo: string
  action?: string
}

export function OAuthButtons({ status, returnTo, action }: OAuthButtonsProps) {
  const t = useT()
  const actionText = action ?? t('登录', 'Sign in')
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
      setError(errorMessage(caught, t('第三方登录暂时不可用', 'Third-party sign-in is unavailable right now')))
      setStarting(null)
    }
  }

  return (
    <>
      {options.map((option) => (
        <Button
          key={option.slug}
          block
          icon={ICONS[option.slug] ?? <LoginOutlined />}
          loading={starting === option.slug}
          disabled={starting !== null && starting !== option.slug}
          onClick={() => void start(option.slug)}
        >
          {t('使用', 'Continue with')} {option.name} {actionText}
        </Button>
      ))}
      {error ? <Alert type="error" showIcon title={error} /> : null}
    </>
  )
}
