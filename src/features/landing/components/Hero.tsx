import styles from './Hero.module.css'

/** 首屏左侧的三个事实点：只讲产品本身，不放没有依据的数字 */
const FACTS = [
  { value: '2 套协议', label: 'OpenAI 与 Anthropic 任选' },
  { value: '1 个密钥', label: '全部模型通用' },
  { value: '按量计费', label: '没有月费与最低消费' },
]

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <h1 className={styles.title}>一个地址，接上所有主流模型</h1>
          <p className={styles.lead}>
            兼容 OpenAI 与 Anthropic 协议，已有的 SDK 只换 base_url，密钥一个、账单一份，
            十分钟跑通第一个请求。
          </p>

          <ul className={styles.facts}>
            {FACTS.map((fact) => (
              <li key={fact.value} className={styles.fact}>
                <span className={styles.factValue}>{fact.value}</span>
                <span className={styles.factLabel}>{fact.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>接入地址</span>
            <span className={styles.panelBadge}>示例域名</span>
          </div>
          <div className={styles.panelBody}>
            <span className={styles.panelLabel}>OpenAI 兼容</span>
            <code className={styles.panelCode}>https://api.your-domain.com/v1</code>
            <span className={styles.panelLabel}>Anthropic 兼容</span>
            <code className={styles.panelCode}>https://api.your-domain.com</code>
          </div>
          <p className={styles.panelFoot}>正式域名定下来后，这里与文档一起替换。</p>
        </div>
      </div>
    </section>
  )
}
