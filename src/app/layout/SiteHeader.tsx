import { App as AntdApp, Button, Drawer } from 'antd'
import { ArrowRightOutlined, MenuOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'

import { useAuthStore } from '@/features/auth/auth-store'
import { logout } from '@/features/auth/session'
import { errorMessage } from '@/shared/api/client'
import { queryClient } from '@/shared/api/query-client'

import { NAV_ITEMS, PRIMARY_ACTION_LABEL } from '@/app/nav'
import { SITE_NAME } from '@/shared/lib/env'
import { useNotReady } from '@/shared/hooks/use-not-ready'

import styles from './SiteHeader.module.css'

/**
 * 页头：品牌 + 横向导航 + 登录 + 主行动按钮。
 * 导航项目前还没有对应页面，点击给提示（见 useNotReady），页面做好后换成路由链接。
 */
export function SiteHeader() {
  const { message } = AntdApp.useApp()
  const notReady = useNotReady()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const authStatus = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
      queryClient.removeQueries({ queryKey: ['current-user'] })
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
          {NAV_ITEMS.map((item) => item === '模型广场' || item === '价格对比' ? (
            <Link key={item} to="/models" className={styles.navLink}>{item}</Link>
          ) : item === '快速开始' ? (
            <Link key={item} to={authStatus === 'authenticated' ? '/console' : '/register'} className={styles.navLink}>{item}</Link>
          ) : (
            <button key={item} type="button" className={styles.navLink} onClick={() => notReady(item)}>
              {item}
            </button>
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
              <Link to="/login"><Button type="text" className={styles.login}>登录</Button></Link>
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
          <Link to="/models" onClick={() => setMenuOpen(false)}>模型广场与价格</Link>
          <Link to={authStatus === 'authenticated' ? '/console' : '/register'} onClick={() => setMenuOpen(false)}>
            {authStatus === 'authenticated' ? '我的账号' : '创建账号'}
          </Link>
          {authStatus !== 'authenticated' ? <Link to="/login" onClick={() => setMenuOpen(false)}>登录</Link> : null}
        </nav>
      </Drawer>
    </header>
  )
}
