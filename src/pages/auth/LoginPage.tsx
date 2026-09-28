import { Alert, Button, Spin } from 'antd'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/auth-store'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { AlternativeLogins } from '@/features/auth/components/AlternativeLogins'
import { PasswordLoginForm } from '@/features/auth/components/PasswordLoginForm'
import { TwoFactorForm } from '@/features/auth/components/TwoFactorForm'
import { useSystemStatus } from '@/features/auth/hooks'
import { safeRedirect } from '@/features/auth/redirect'
import { acceptLogin } from '@/features/auth/session'
import type { AuthBundle, LoginChallenge } from '@/features/auth/types'
import { usePageTitle } from '@/shared/hooks/use-page-title'
import { useT } from '@/shared/i18n'

import styles from './AuthPage.module.css'

export function LoginPage() {
  const t = useT()
  usePageTitle(t('登录', 'Sign in'))
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
        title={challenge ? t('验证身份', 'Verify identity') : t('欢迎回来', 'Welcome back')}
        subtitle={challenge ? t('还差一步，完成验证就能进入账号。', 'One more step to finish before you are in.') : t('登录后即可管理你的账号。', 'Sign in to manage your account.')}
        footer={
          !challenge && system.data?.register_enabled && system.data.password_register_enabled ? (
            <>
              {t('还没有账号？', 'No account yet?')} <Link to="/register">{t('创建账号', 'Create one')}</Link>
            </>
          ) : undefined
        }
      >
        {fromRegistration?.registered && !challenge ? (
          <Alert type="success" showIcon title={t('注册成功，请登录', 'Registered — please sign in')} />
        ) : null}
        {system.isPending || authStatus === 'unknown' ? (
          <div className={styles.loading}><Spin description={t('正在连接...', 'Connecting...')} /></div>
        ) : system.isError ? (
          <>
            <Alert type="error" showIcon title={t('暂时无法连接服务，请稍后重试', 'Cannot reach the service right now — try again later')} />
            <Button onClick={() => void system.refetch()}>{t('重试', 'Retry')}</Button>
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
          <Alert type="info" showIcon title={t('当前未开放密码登录，请使用下方的其他方式', 'Password sign-in is off — use one of the other ways below')} />
        ) : null}
        {!challenge && system.data && !system.isError ? (
          <AlternativeLogins
            status={system.data}
            returnTo={destination}
            mode="login"
            onAuthenticated={handleAuthenticated}
            onChallenge={setChallenge}
          />
        ) : null}
      </AuthCard>
    </div>
  )
}
