import { Alert, Button, Spin } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { AuthCard } from '@/features/auth/components/AuthCard'
import { TwoFactorForm } from '@/features/auth/components/TwoFactorForm'
import { consumeOAuthReturn } from '@/features/auth/oauth'
import { acceptLogin } from '@/features/auth/session'
import { isLoginChallenge } from '@/features/auth/types'
import type { AuthBundle, LoginChallenge, LoginResult } from '@/features/auth/types'
import { apiGet, errorMessage } from '@/shared/api/client'
import { usePageTitle } from '@/shared/hooks/use-page-title'

import styles from './AuthPage.module.css'

/**
 * 授权方重定向回 /oauth/:provider 后，由浏览器向 New API 兑换一次性 code/state。
 * 服务端决定是直接登录还是继续进行两步验证；这里只负责显示结果。
 */
export function OAuthCallbackPage() {
  usePageTitle('第三方登录')
  const { provider = '' } = useParams()
  const [params] = useSearchParams()
  const code = params.get('code') ?? ''
  const state = params.get('state') ?? ''
  const providerError = params.get('error') ?? ''
  const providerDescription = params.get('error_description') ?? ''
  const navigate = useNavigate()
  const [message, setMessage] = useState<string | null>(null)
  const invalidMessage = !provider
    ? '登录方式不正确，请返回重新登录'
    : !state || (!code && !providerError)
      ? '授权信息不完整，请返回重新登录'
      : null
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null)
  const exchange = useRef<{ key: string; request: Promise<LoginResult> } | null>(null)
  const destination = useRef('/console')

  function finish(bundle: AuthBundle) {
    acceptLogin(bundle)
    navigate(destination.current, { replace: true })
  }

  useEffect(() => {
    if (invalidMessage) return
    let active = true
    const key = `${provider}:${state}:${code}:${providerError}`
    if (exchange.current?.key !== key) {
      exchange.current = {
        key,
        request: apiGet<LoginResult>(`/api/oauth/${encodeURIComponent(provider)}`, {
          code: code || undefined,
          state,
          error: providerError || undefined,
          error_description: providerDescription || undefined,
        }, { skipAuth: true }),
      }
    }
    void exchange.current.request.then((result) => {
      if (!active) return
      destination.current = consumeOAuthReturn(state)
      if (isLoginChallenge(result)) {
        setChallenge(result)
      } else {
        finish(result)
      }
    }).catch((caught: unknown) => {
      if (active) setMessage(errorMessage(caught, '授权未完成，请重新登录'))
    })
    return () => { active = false }
  // finish/navigate only run once the one-time callback is exchanged.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, code, state, providerError, providerDescription, invalidMessage])

  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />
      <AuthCard
        title={challenge ? '验证身份' : '正在完成登录'}
        subtitle={challenge ? '完成账号的二次验证后即可进入。' : '请稍候，不需要重复授权。'}
        footer={<Link to="/login">返回登录</Link>}
      >
        {challenge ? (
          <TwoFactorForm challenge={challenge} onAuthenticated={finish} onCancel={() => navigate('/login', { replace: true })} />
        ) : message || invalidMessage ? (
          <Alert type="error" showIcon title={message || invalidMessage} action={<Link to="/login"><Button size="small">重试</Button></Link>} />
        ) : (
          <div className={styles.loading}><Spin description="正在确认授权..." /></div>
        )}
      </AuthCard>
    </div>
  )
}
