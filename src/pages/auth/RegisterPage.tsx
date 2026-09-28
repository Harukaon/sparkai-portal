import { Alert, Button, Spin } from 'antd'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/auth-store'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { AlternativeLogins } from '@/features/auth/components/AlternativeLogins'
import { availableOAuthOptions } from '@/features/auth/oauth'
import { RegisterForm } from '@/features/auth/components/RegisterForm'
import { useSystemStatus } from '@/features/auth/hooks'
import { usePageTitle } from '@/shared/hooks/use-page-title'
import { useT } from '@/shared/i18n'

import styles from './AuthPage.module.css'

export function RegisterPage() {
  const t = useT()
  usePageTitle(t('创建账号', 'Create account'))
  const system = useSystemStatus()
  const authStatus = useAuthStore((state) => state.status)
  const navigate = useNavigate()

  if (authStatus === 'authenticated') return <Navigate replace to="/console" />

  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />
      <AuthCard
        title={t('创建账号', 'Create account')}
        subtitle={t('几步完成注册，开始使用。', 'A few steps and you are in.')}
        footer={<>{t('已有账号？', 'Already have an account?')} <Link to="/login">{t('去登录', 'Sign in')}</Link></>}
      >
        {system.isPending || authStatus === 'unknown' ? (
          <div className={styles.loading}><Spin description={t('正在连接...', 'Connecting...')} /></div>
        ) : system.isError ? (
          <>
            <Alert type="error" showIcon title={t('暂时无法连接服务，请稍后重试', 'Cannot reach the service right now — try again later')} />
            <Button onClick={() => void system.refetch()}>{t('重试', 'Retry')}</Button>
          </>
        ) : system.data?.register_enabled &&
          (system.data.password_register_enabled || availableOAuthOptions(system.data).length > 0) ? (
          <>
            {system.data.password_register_enabled ? (
              <RegisterForm
                status={system.data}
                onRegistered={(username) =>
                  navigate('/login', { replace: true, state: { registered: true, username } })
                }
              />
            ) : null}
            <AlternativeLogins status={system.data} returnTo="/console" mode="register" />
          </>
        ) : (
          <Alert type="info" showIcon title={t('当前未开放注册', 'Registration is currently closed')} description={t('请联系站点管理员。', 'Please contact the site administrator.')} />
        )}
      </AuthCard>
    </div>
  )
}
