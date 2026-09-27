import { Alert, Button, Spin } from 'antd'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/auth-store'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { OAuthButtons } from '@/features/auth/components/OAuthButtons'
import { PasskeyLoginButton } from '@/features/auth/components/PasskeyLoginButton'
import { PasswordLoginForm } from '@/features/auth/components/PasswordLoginForm'
import { TwoFactorForm } from '@/features/auth/components/TwoFactorForm'
import { WeChatLogin } from '@/features/auth/components/WeChatLogin'
import { useSystemStatus } from '@/features/auth/hooks'
import { safeRedirect } from '@/features/auth/redirect'
import { acceptLogin } from '@/features/auth/session'
import type { AuthBundle, LoginChallenge } from '@/features/auth/types'
import { usePageTitle } from '@/shared/hooks/use-page-title'

import styles from './AuthPage.module.css'

export function LoginPage() {
  usePageTitle('登录')
  const system = useSystemStatus()
  const authStatus = useAuthStore((state) => state.status)
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null)
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const destination = safeRedirect(params.get('redirect'))
  const fromRegistration = location.state as { registered?: boolean; username?: string } | null

  function handleAuthenticated(bundle: AuthBundle) {
    acceptLogin(bundle)
    navigate(destination, { replace: true })
  }

  if (authStatus === 'authenticated') return <Navigate replace to={destination} />

  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />
      <AuthCard
        title={challenge ? '验证身份' : '欢迎回来'}
        subtitle={challenge ? '还差一步，完成验证就能进入账号。' : '登录后即可管理你的账号。'}
        footer={
          !challenge && system.data?.register_enabled && system.data.password_register_enabled ? (
            <>
              还没有账号？<Link to="/register">创建账号</Link>
            </>
          ) : undefined
        }
      >
        {fromRegistration?.registered && !challenge ? (
          <Alert type="success" showIcon title="注册成功，请登录" />
        ) : null}
        {system.isPending || authStatus === 'unknown' ? (
          <div className={styles.loading}><Spin tip="正在连接..." /></div>
        ) : system.isError ? (
          <>
            <Alert type="error" showIcon title="暂时无法连接服务，请稍后重试" />
            <Button onClick={() => void system.refetch()}>重试</Button>
          </>
        ) : challenge ? (
          <TwoFactorForm
            challenge={challenge}
            onAuthenticated={handleAuthenticated}
            onCancel={() => setChallenge(null)}
          />
        ) : system.data?.password_login_enabled ? (
          <PasswordLoginForm
            status={system.data}
            initialUsername={fromRegistration?.username}
            onAuthenticated={handleAuthenticated}
            onChallenge={setChallenge}
          />
        ) : system.data?.password_login_enabled === false ? (
          <Alert type="info" showIcon title="当前未开放密码登录，请使用下方的其他方式" />
        ) : null}
        {!challenge && system.data && !system.isError ? (
          <>
            <OAuthButtons status={system.data} returnTo={destination} />
            <PasskeyLoginButton status={system.data} onAuthenticated={handleAuthenticated} />
            <WeChatLogin status={system.data} onAuthenticated={handleAuthenticated} onChallenge={setChallenge} />
          </>
        ) : null}
      </AuthCard>
    </div>
  )
}
