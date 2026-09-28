import { App as AntdApp, Button, Drawer } from 'antd'
import { ArrowRightOutlined, GlobalOutlined, MenuOutlined } from '@ant-design/icons'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'

import { useAuthStore } from '@/features/auth/auth-store'
import { logout } from '@/features/auth/session'
import { errorMessage } from '@/shared/api/client'
import { queryClient } from '@/shared/api/query-client'
import { setLang, useLang, useT } from '@/shared/i18n'

import { NAV_ITEMS, PRIMARY_ACTION_LABEL, navLabel } from '@/app/nav'
import { siteName } from '@/shared/lib/env'

import styles from './SiteHeader.module.css'

/** 语言切换：中/英互换的小按钮 */
function LangToggle() {
  const lang = useLang()
  const next = lang === 'zh' ? 'en' : 'zh'
  return (
    <Button
      type="text"
      className={styles.langToggle}
      aria-label={next === 'zh' ? '切换到中文' : 'Switch to English'}
      onClick={() => void setLang(next)}
    >
      <GlobalOutlined aria-hidden />
      <span aria-hidden>{next === 'zh' ? '中文' : 'EN'}</span>
    </Button>
  )
}

/**
 * 页头：品牌 + 横向导航 + 语言切换 + 登录 + 主行动按钮。
 * 导航只放已经做好的页面，当前所在页面高亮。
 */
export function SiteHeader() {
  const { message } = AntdApp.useApp()
  const t = useT()
  const lang = useLang()
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
      message.success(t('已退出登录', 'Signed out'))
    } catch (error: unknown) {
      message.error(errorMessage(error, t('退出失败，请稍后重试', 'Sign-out failed. Please try again.')))
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand} aria-label={`${siteName()} ${t('首页', 'home')}`}>
          <span className={styles.mark} aria-hidden="true" />
          <span className={styles.brandName}>{siteName()}</span>
        </Link>

        <nav className={styles.nav} aria-label={t('主导航', 'Main navigation')}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
            >
              {navLabel(item.label, lang)}
            </NavLink>
          ))}
        </nav>

        <div className={styles.actions}>
          <LangToggle />
          <Button
            className={styles.menuToggle}
            type="text"
            icon={<MenuOutlined />}
            aria-label={t('打开导航', 'Open navigation')}
            onClick={() => setMenuOpen(true)}
          />
          {authStatus === 'authenticated' ? (
            <>
              <Link to="/console" className={styles.login}>
                {user?.display_name || user?.username || t('我的账号', 'My account')}
              </Link>
              <Button type="text" loading={loggingOut} onClick={() => void handleLogout()}>
                {t('退出登录', 'Sign out')}
              </Button>
            </>
          ) : authStatus === 'anonymous' ? (
            <>
              <Link to="/register">
                <Button type="primary" icon={<ArrowRightOutlined />} iconPlacement="end">
                  {navLabel(PRIMARY_ACTION_LABEL, lang)}
                </Button>
              </Link>
            </>
          ) : null}
        </div>
      </div>
      <Drawer title={t('导航', 'Navigation')} placement="right" open={menuOpen} onClose={() => setMenuOpen(false)}>
        <nav className={styles.mobileNav} aria-label={t('移动端导航', 'Mobile navigation')}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? styles.mobileActive : undefined)}
              onClick={() => setMenuOpen(false)}
            >
              {navLabel(item.label, lang)}
            </NavLink>
          ))}
          {authStatus !== 'authenticated' ? (
            <>
              <NavLink to="/login" className={({ isActive }) => (isActive ? styles.mobileActive : undefined)} onClick={() => setMenuOpen(false)}>{t('登录', 'Sign in')}</NavLink>
              <NavLink to="/register" className={({ isActive }) => (isActive ? styles.mobileActive : undefined)} onClick={() => setMenuOpen(false)}>{t('创建账号', 'Create account')}</NavLink>
            </>
          ) : null}
          <div className={styles.drawerLang}>
            <LangToggle />
          </div>
        </nav>
      </Drawer>
    </header>
  )
}
