import { ACCESS_STEPS } from '@/features/landing/data'

import styles from './AccessSteps.module.css'

/** 接入步骤：这里的内容确实是先后顺序，所以用 1 2 3 编号 */
export function AccessSteps() {
  return (
    <ol className={styles.steps}>
      {ACCESS_STEPS.map((step, index) => (
        <li key={step.title} className={styles.step}>
          <div className={styles.index} aria-hidden="true">
            {index + 1}
          </div>
          <div className={styles.body}>
            <h3 className={styles.title}>{step.title}</h3>
            <p className={styles.description}>{step.description}</p>
            {step.code ? <pre className={styles.code}>{step.code}</pre> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
