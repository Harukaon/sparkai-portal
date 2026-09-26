import { Outlet } from 'react-router-dom'

import { SiteFooter } from '@/app/layout/SiteFooter'
import { SiteHeader } from '@/app/layout/SiteHeader'

/** 站点骨架：页头 + 内容 + 页脚，所有前台页面都套在这一层里 */
export function SiteLayout() {
  return (
    <>
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      <SiteHeader />
      <main id="main" style={{ flex: 1 }}>
        <Outlet />
      </main>
      <SiteFooter />
    </>
  )
}
