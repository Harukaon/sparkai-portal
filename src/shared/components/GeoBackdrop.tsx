import styles from './GeoBackdrop.module.css'

/**
 * 背景装饰：两张大幅弧线与底部一片柔光，缓慢漂移。
 *
 * 做法是几个超大尺寸的圆环，只露出边缘那一段弧 —— 所以看到的是几道很长的弧线，
 * 而不是圆。纯装饰，整块 aria-hidden 且不接收指针事件。
 */
export function GeoBackdrop() {
  return (
    <div className={styles.backdrop} aria-hidden="true">
      <span className={`${styles.arc} ${styles.arcOuter}`} />
      <span className={`${styles.arc} ${styles.arcMid}`} />
      <span className={`${styles.arc} ${styles.arcInner}`} />
      <span className={styles.glowBottom} />
      <span className={styles.glowTop} />
    </div>
  )
}
