import { BILLING_EXAMPLE, PRICING_RULES } from '@/features/landing/data'
import { estimateCost } from '@/features/landing/billing'
import { formatInt, formatMoney, formatUnitPrice } from '@/shared/lib/format'

import styles from './PricingPreview.module.css'

/**
 * 价格区块：左侧讲规则，右侧给一次请求的算账示例。
 * 与其让人猜「按量计费到底多少钱」，不如把一次调用的账算给他看。
 */
export function PricingPreview() {
  const cost = estimateCost(BILLING_EXAMPLE)

  return (
    <div className={styles.layout}>
      <ul className={styles.rules}>
        {PRICING_RULES.map((rule) => (
          <li key={rule} className={styles.rule}>
            <span className={styles.ruleMark} aria-hidden="true" />
            <span>{rule}</span>
          </li>
        ))}
      </ul>

      <div className={styles.example}>
        <div className={styles.exampleHead}>
          <h3 className={styles.exampleTitle}>算一笔账</h3>
          <p className={styles.exampleLead}>
            用 {BILLING_EXAMPLE.model} 问一个问题：带上 {formatInt(BILLING_EXAMPLE.inputTokens)}{' '}
            token 的上下文，回答约 {formatInt(BILLING_EXAMPLE.outputTokens)} token。
          </p>
        </div>

        <dl className={styles.ledger}>
          <div className={styles.ledgerRow}>
            <dt>
              输入 {formatInt(BILLING_EXAMPLE.inputTokens)} token
              <span className={styles.unit}>{formatUnitPrice(BILLING_EXAMPLE.inputPrice)}</span>
            </dt>
            <dd>{formatMoney(cost.inputCost, '$')}</dd>
          </div>
          <div className={styles.ledgerRow}>
            <dt>
              输出 {formatInt(BILLING_EXAMPLE.outputTokens)} token
              <span className={styles.unit}>{formatUnitPrice(BILLING_EXAMPLE.outputPrice)}</span>
            </dt>
            <dd>{formatMoney(cost.outputCost, '$')}</dd>
          </div>
          <div className={`${styles.ledgerRow} ${styles.ledgerTotal}`}>
            <dt>这一次合计</dt>
            <dd>{formatMoney(cost.total, '$')}</dd>
          </div>
        </dl>

        <p className={styles.exampleFoot}>示例价格仅用于说明算法，各模型真实单价以控制台为准。</p>
      </div>
    </div>
  )
}
