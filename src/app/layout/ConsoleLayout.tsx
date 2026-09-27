import { DashboardOutlined, ProfileOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/auth-store'

import styles from './ConsoleLayout.module.css'

interface ConsoleNavItem {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
}

/** 用户控制台的侧边导航；新页面做好后在这里加一项。 */
const CONSOLE_NAV: ConsoleNavItem[] = [
  { to: '/console', label: '总览', icon: <DashboardOutlined />, end: true },
  { to: '/console/logs', label: '请求记录', icon: <ProfileOutlined /> },
]

export function ConsoleLayout() {
  const user = useAuthStore((state) => state.user)

  return (
    <div className={styles.shell}>
      <aside className={styles.side}>
        <div className={styles.account}>
          <span className={styles.avatar} aria-hidden="true">
            {(user?.display_name || user?.username || '?').slice(0, 1).toUpperCase()}
          </span>
          <span className={styles.accountText}>
            <strong>{user?.display_name || user?.username}</strong>
            <span>{user?.group ? `分组：${user.group}` : '我的账号'}</span>
          </span>
        </div>
        <nav className={styles.nav} aria-label="控制台">
          {CONSOLE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className={styles.content}>
        <Outlet />
      </section>
    </div>
  )
}
