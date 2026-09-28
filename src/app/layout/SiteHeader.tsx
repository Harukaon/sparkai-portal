import { App as AntdApp, Button, Drawer } from 'antd'
import { ArrowRightOutlined, MenuOutlined } from '@ant-design/icons'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'

import { useAuthStore } from '@/features/auth/auth-store'
import { logout } from '@/features/auth/session'
import { errorMessage } from '@/shared/api/client'
import { queryClient } from '@/shared/api/query-client'

import { NAV_ITEMS, PRIMARY_ACTION_LABEL } from '@/app/nav'
import { SITE_NAME } from '@/shared/lib/env'

import styles from './SiteHeader.module.css'

/**
 * 页头：品牌 + 横向导航 + 登录 + 主行动按钮。
 * 导航只放已经做好的页面，当前所在页面高亮。
 */
export function SiteHeader() {
  const { message } = AntdApp.useApp()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const authStatus = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const navItems = NAV_ITEMS.filter((item) => !item.authOnly || authStatus === 'authenticated')

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
      // 退出后清掉所有缓存，避免下一个登录的人看到上一个账号的数据
      queryClient.clear()
      navigate('/')
      message.success('已退出登录')
    } catch (error: unknown) {
      message.error(errorMessage(error, '退出失败，请稍后重试'))
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand} aria-label={`${SITE_NAME} 首页`}>
          <span className={styles.mark} aria-hidden="true" />
          <span className={styles.brandName}>{SITE_NAME}</span>
        </Link>

        <nav className={styles.nav} aria-label="主导航">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.actions}>
          <Button
            className={styles.menuToggle}
            type="text"
            icon={<MenuOutlined />}
            aria-label="打开导航"
            onClick={() => setMenuOpen(true)}
          />
          {authStatus === 'authenticated' ? (
            <>
              <Link to="/console" className={styles.login}>{user?.display_name || user?.username || '我的账号'}</Link>
              <Button type="text" loading={loggingOut} onClick={() => void handleLogout()}>
                退出登录
              </Button>
            </>
          ) : authStatus === 'anonymous' ? (
            <>
              {pathname !== '/' ? (
                <Link to="/login"><Button type="text" className={styles.login}>登录</Button></Link>
              ) : null}
              <Link to="/register">
                <Button type="primary" icon={<ArrowRightOutlined />} iconPlacement="end">
                  {PRIMARY_ACTION_LABEL}
                </Button>
              </Link>
            </>
          ) : null}
        </div>
      </div>
      <Drawer title="导航" placement="right" open={menuOpen} onClose={() => setMenuOpen(false)}>
        <nav className={styles.mobileNav} aria-label="移动端导航">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? styles.mobileActive : undefined)}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          {authStatus !== 'authenticated' ? (
            <>
              <NavLink to="/login" className={({ isActive }) => (isActive ? styles.mobileActive : undefined)} onClick={() => setMenuOpen(false)}>登录</NavLink>
              <NavLink to="/register" className={({ isActive }) => (isActive ? styles.mobileActive : undefined)} onClick={() => setMenuOpen(false)}>创建账号</NavLink>
            </>
          ) : null}
        </nav>
      </Drawer>
    </header>
  )
}
