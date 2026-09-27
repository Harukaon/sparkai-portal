import { Outlet } from 'react-router-dom'

import { SiteHeader } from '@/app/layout/SiteHeader'

import styles from './SiteLayout.module.css'

/**
 * 站点骨架：只有页头 + 内容区。
 *
 * 首页是一屏锁屏版面，所以这里不设页脚，内容区自己占满剩余高度。
 * 以后加控制台等多内容页面时，把 footer 加到 main 之后即可（flex 布局不会因此塌掉）。
 */
export function SiteLayout() {
  return (
    <>
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      <SiteHeader />
      <main id="main" className={styles.main}>
        <Outlet />
      </main>
    </>
  )
}
