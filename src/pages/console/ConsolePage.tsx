import { Alert, Button, Spin } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

import { fetchCurrentUser } from '@/features/auth/api'
import { useAuthStore } from '@/features/auth/auth-store'
import { usePageTitle } from '@/shared/hooks/use-page-title'

import styles from './ConsolePage.module.css'

/** 当前只展示登录成功结果；模型、密钥、充值等下一步再逐项接入。 */
export function ConsolePage() {
  usePageTitle('账号')
  const updateUser = useAuthStore((state) => state.updateUser)
  const user = useAuthStore((state) => state.user)
  const profile = useQuery({ queryKey: ['current-user'], queryFn: fetchCurrentUser, retry: false })

  useEffect(() => {
    if (profile.data) updateUser(profile.data)
  }, [profile.data, updateUser])

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <span className={styles.eyebrow}>你的账号</span>
        <h1>欢迎，{user?.display_name || user?.username}</h1>
        {profile.isPending ? (
          <Spin />
        ) : profile.isError ? (
          <Alert type="error" showIcon title="暂时无法确认账号信息" action={<Button size="small" onClick={() => void profile.refetch()}>重试</Button>} />
        ) : (
          <p>已连接到账户，登录成功。</p>
        )}
        <p className={styles.note}>模型、密钥、用量和充值功能将在后续步骤接入。</p>
      </div>
    </div>
  )
}
