import type { ReactNode } from 'react'

import styles from './AuthCard.module.css'

interface AuthCardProps {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

/** 登录、注册、两步验证共用的卡片外壳 */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </header>
      <div className={styles.body}>{children}</div>
      {footer ? <footer className={styles.foot}>{footer}</footer> : null}
    </section>
  )
}
