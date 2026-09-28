import { NavLink } from 'react-router-dom'

import { NAV_ITEMS, TAB_BAR_HOME, navLabel } from '@/app/nav'
import { useAuthStore } from '@/features/auth/auth-store'
import { useLang } from '@/shared/i18n'

import styles from './MobileTabBar.module.css'

/**
 * 手机底部 App 式导航：首页 + 主要页面。
 *
 * 未登录时「控制台」位置换成「登录」，避免点了被登录页挡一层。
 */
export function MobileTabBar() {
  const lang = useLang()
  const authStatus = useAuthStore((state) => state.status)

  const tabs = [
    TAB_BAR_HOME,
    ...NAV_ITEMS.filter((item) => item.inTabBar && (!item.authOnly || authStatus === 'authenticated')),
  ]

  return (
    <nav className={styles.tabBar} aria-label={lang === 'zh' ? '底部导航' : 'Bottom navigation'}>
      {tabs.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`}
        >
          <span className={styles.icon} aria-hidden>
            {item.icon}
          </span>
          <span className={styles.label}>{navLabel(item.label, lang)}</span>
        </NavLink>
      ))}
      {authStatus !== 'authenticated' ? (
        <NavLink to="/login" className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`}>
          <span className={styles.icon} aria-hidden>
            {NAV_ITEMS.find((item) => item.to === '/console')?.icon}
          </span>
          <span className={styles.label}>{lang === 'zh' ? '登录' : 'Sign in'}</span>
        </NavLink>
      ) : null}
    </nav>
  )
}
