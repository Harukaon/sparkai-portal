import { Button, Dropdown } from 'antd'
import { MenuOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'

import { NAV_ITEMS, PRIMARY_ACTION_HREF } from '@/app/nav'
import { SITE_NAME } from '@/shared/lib/env'

import styles from './SiteHeader.module.css'

export function SiteHeader() {
  const menuItems = NAV_ITEMS.map((item) => ({
    key: item.href,
    label: <a href={item.href}>{item.label}</a>,
  }))

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand} aria-label={`${SITE_NAME} 首页`}>
          <span className={styles.mark} aria-hidden="true" />
          <span className={styles.brandName}>{SITE_NAME}</span>
        </Link>

        <nav className={styles.nav} aria-label="主导航">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <span className={styles.menuOnly}>
            <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={['click']}>
              <Button type="text" icon={<MenuOutlined />} aria-label="打开菜单" />
            </Dropdown>
          </span>
          <a href={PRIMARY_ACTION_HREF} className={styles.cta}>
            <Button type="primary">获取密钥</Button>
          </a>
        </div>
      </div>
    </header>
  )
}
