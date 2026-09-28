import {
  CustomerServiceOutlined,
  DashboardOutlined,
  GiftOutlined,
  InboxOutlined,
  KeyOutlined,
  ProfileOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/auth-store'
import { ADMIN_ROLE } from '@/features/auth/components/RequireAuth'
import { fetchTicketSummary } from '@/features/tickets/api'
import { useT } from '@/shared/i18n'

import styles from './ConsoleLayout.module.css'

interface ConsoleNavItem {
  to: string
  /** [中文, 英文] */
  label: [string, string]
  icon: ReactNode
  end?: boolean
  /** 只有管理员能看到 */
  adminOnly?: boolean
  /** 右侧小数字：工单待处理数 */
  badge?: 'user-tickets' | 'admin-tickets'
}

/** 用户控制台的侧边导航；新页面做好后在这里加一项。 */
const CONSOLE_NAV: ConsoleNavItem[] = [
  { to: '/console', label: ['总览', 'Overview'], icon: <DashboardOutlined />, end: true },
  { to: '/console/keys', label: ['API 密钥', 'API Keys'], icon: <KeyOutlined /> },
  { to: '/console/logs', label: ['请求记录', 'Logs'], icon: <ProfileOutlined /> },
  { to: '/console/wallet', label: ['充值与账单', 'Billing'], icon: <WalletOutlined /> },
  { to: '/console/invite', label: ['邀请奖励', 'Referrals'], icon: <GiftOutlined /> },
  { to: '/console/tickets', label: ['工单', 'Tickets'], icon: <CustomerServiceOutlined />, badge: 'user-tickets' },
  { to: '/console/admin/tickets', label: ['工单管理', 'Ticket desk'], icon: <InboxOutlined />, adminOnly: true, badge: 'admin-tickets' },
]

export function ConsoleLayout() {
  const t = useT()
  const user = useAuthStore((state) => state.user)
  const isAdmin = (user?.role ?? 0) >= ADMIN_ROLE
  // 小红点数字：管理员 = 待处理工单总数；普通用户 = 客服已回复、等自己看的工单数
  const summary = useQuery({
    queryKey: ['ticket-summary', user?.id],
    queryFn: fetchTicketSummary,
    enabled: Boolean(user?.id),
    refetchInterval: 60_000,
    retry: false,
  })
  const badgeFor = (item: ConsoleNavItem): number => {
    if (!summary.data || !item.badge) return 0
    if (item.badge === 'admin-tickets') return summary.data.is_admin ? summary.data.pending : 0
    return summary.data.is_admin ? 0 : summary.data.pending
  }

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
          {CONSOLE_NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => {
            const count = badgeFor(item)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
              >
                <span aria-hidden="true">{item.icon}</span>
                {t(item.label[0], item.label[1])}
                {count > 0 ? (
                  <span className={styles.count} aria-label={t(`${count} 条待处理`, `${count} pending`)}>
                    {count > 99 ? '99+' : count}
                  </span>
                ) : null}
              </NavLink>
            )
          })}
        </nav>
      </aside>
      <section className={styles.content}>
        <Outlet />
      </section>
    </div>
  )
}
