import { FOOTER_LINKS } from '@/app/nav'
import { SITE_NAME } from '@/shared/lib/env'

import styles from './SiteFooter.module.css'

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brandBlock}>
          <div className={styles.brand}>
            <span className={styles.mark} aria-hidden="true" />
            <span className={styles.brandName}>{SITE_NAME}</span>
          </div>
          <p className={styles.tagline}>一个地址接入主流大模型，按量付费，用量透明。</p>
        </div>

        <nav className={styles.links} aria-label="页脚导航">
          {FOOTER_LINKS.map((item) => (
            <a key={item.label} href={item.href} className={styles.link}>
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      <div className={`container ${styles.bottom}`}>
        <span>
          © {year} {SITE_NAME}
        </span>
        <span>本站为 AI 接口转发服务，与各模型厂商无隶属关系。</span>
      </div>
    </footer>
  )
}
