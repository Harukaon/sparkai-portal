import { DashboardOutlined, GiftOutlined, KeyOutlined, ProfileOutlined, WalletOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/auth-store'
import { useT } from '@/shared/i18n'

import styles from './ConsoleLayout.module.css'

interface ConsoleNavItem {
  to: string
  /** [中文, 英文] */
  label: [string, string]
  icon: ReactNode
  end?: boolean
}

/** 用户控制台的侧边导航；新页面做好后在这里加一项。 */
const CONSOLE_NAV: ConsoleNavItem[] = [
  { to: '/console', label: ['总览', 'Overview'], icon: <DashboardOutlined />, end: true },
  { to: '/console/keys', label: ['API 密钥', 'API Keys'], icon: <KeyOutlined /> },
  { to: '/console/logs', label: ['请求记录', 'Logs'], icon: <ProfileOutlined /> },
  { to: '/console/wallet', label: ['充值与账单', 'Billing'], icon: <WalletOutlined /> },
  { to: '/console/invite', label: ['邀请奖励', 'Referrals'], icon: <GiftOutlined /> },
]

export function ConsoleLayout() {
  const t = useT()
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
            <span>{user?.group ? t(`分组：${user.group}`, `Group: ${user.group}`) : t('我的账号', 'My account')}</span>
          </span>
        </div>
        <nav className={styles.nav} aria-label={t('控制台', 'Console')}>
          {CONSOLE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
            >
              <span aria-hidden="true">{item.icon}</span>
              {t(item.label[0], item.label[1])}
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
