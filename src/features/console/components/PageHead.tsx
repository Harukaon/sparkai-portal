import type { ReactNode } from 'react'

import styles from './PageHead.module.css'

interface PageHeadProps {
  title: string
  description?: ReactNode
  actions?: ReactNode
}

/** 控制台各页统一的标题区：标题、一句话说明、右侧操作。 */
export function PageHead({ title, description, actions }: PageHeadProps) {
  return (
    <header className={styles.head}>
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  )
}
