import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/format'

import styles from './Section.module.css'

interface SectionProps {
  /** 锚点 id，对应页头导航 */
  id?: string
  title: string
  description?: string
  children: ReactNode
  className?: string
}

/** 全站统一的分区外壳：负责宽度、上下留白与锚点偏移 */
export function Section({ id, title, description, children, className }: SectionProps) {
  return (
    <section id={id} className={cn('container', styles.section, className)}>
      <header className={styles.heading}>
        <h2 className={styles.title}>{title}</h2>
        {description ? <p className={styles.description}>{description}</p> : null}
      </header>
      {children}
    </section>
  )
}
