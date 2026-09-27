import { Spin } from 'antd'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/auth-store'

import styles from './RequireAuth.module.css'

/**
 * 需要登录才能看的页面套一层这个。
 * 登录状态还没确认（刚打开页面、正在用 Cookie 续期）时先转圈，别急着踢去登录页。
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status)
  const location = useLocation()

  if (status === 'unknown') {
    return (
      <div className={styles.pending}>
        <Spin size="large" />
      </div>
    )
  }

  if (status === 'anonymous') {
    const back = `${location.pathname}${location.search}`
    return <Navigate replace to={`/login?redirect=${encodeURIComponent(back)}`} />
  }

  return children
}
