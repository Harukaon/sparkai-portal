import { Alert, Button, Spin } from 'antd'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/auth-store'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { OAuthButtons } from '@/features/auth/components/OAuthButtons'
import { availableOAuthOptions } from '@/features/auth/oauth'
import { RegisterForm } from '@/features/auth/components/RegisterForm'
import { useSystemStatus } from '@/features/auth/hooks'
import { usePageTitle } from '@/shared/hooks/use-page-title'

import styles from './AuthPage.module.css'

export function RegisterPage() {
  usePageTitle('创建账号')
  const system = useSystemStatus()
  const authStatus = useAuthStore((state) => state.status)
  const navigate = useNavigate()

  if (authStatus === 'authenticated') return <Navigate replace to="/console" />

  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />
      <AuthCard
        title="创建账号"
        subtitle="几步完成注册，开始使用。"
        footer={<>已有账号？<Link to="/login">去登录</Link></>}
      >
        {system.isPending || authStatus === 'unknown' ? (
          <div className={styles.loading}><Spin description="正在连接..." /></div>
        ) : system.isError ? (
          <>
            <Alert type="error" showIcon title="暂时无法连接服务，请稍后重试" />
            <Button onClick={() => void system.refetch()}>重试</Button>
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
            <OAuthButtons status={system.data} returnTo="/console" action="继续" />
          </>
        ) : (
          <Alert type="info" showIcon title="当前未开放注册" description="请联系站点管理员。" />
        )}
      </AuthCard>
    </div>
  )
}
