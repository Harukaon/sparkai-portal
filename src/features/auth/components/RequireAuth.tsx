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

/** 管理员角色门槛，与 New API 一致：10 管理员 / 100 超级管理员 */
export const ADMIN_ROLE = 10

/** 只给管理员看的页面：普通用户直接送回控制台首页（真正的权限由后端再校验一次） */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const role = useAuthStore((state) => state.user?.role ?? 0)
  if (role < ADMIN_ROLE) return <Navigate replace to="/console" />
  return children
}
