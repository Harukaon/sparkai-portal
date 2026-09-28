import { Slider } from 'antd'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useQuotaFormat } from '@/features/console/quota'
import { ModelIcon } from '@/features/landing/components/ModelIcon'
import { PRICE_ROWS } from '@/features/landing/data'
import { blendedPrice, compareMonthlyCost } from '@/features/landing/pricing'
import { useT } from '@/shared/i18n'
import { formatMoney, formatPercent } from '@/shared/lib/format'

import styles from './PricePanel.module.css'

/** 综合单价里输入占的比例，与 pricing.ts 的口径保持一致 */
const INPUT_SHARE_LABEL: [string, string] = ['输入 3 : 输出 1', 'input 3 : output 1']

/** 用量滑块的档位：单位百万 token */
const VOLUME_MIN = 1
const VOLUME_MAX = 500
const VOLUME_DEFAULT = 130

/** 示例数据以美元记，按后台汇率换算成人民币显示 */
function unitText(value: number, rate: number): string {
  return formatMoney(value * rate, '¥', 2)
}

/** 每百万 token 的单价，用一行紧凑文字表示 */
function pricePair(input: number, output: number, rate: number): string {
  return `${unitText(input, rate)} / ${unitText(output, rate)}`
}

/**
 * 右侧价格面板：上面是官方与本站的单价对照，下面是实时计算器。
 * 单价口径为「人民币 / 百万 token」（示例数据以美元记，按汇率换算），输入与输出分开列。
 */
export function PricePanel() {
  const t = useT()
  const [volume, setVolume] = useState(VOLUME_DEFAULT)
  const { rate } = useQuotaFormat()

  const comparison = useMemo(() => compareMonthlyCost(PRICE_ROWS, volume), [volume])

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>{t('价格对比', 'Price comparison')}</h2>
        <span className={styles.unitNote}>{t('价格示例 · 元 / 百万 token', 'Sample prices · CNY / M tokens')}</span>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.colModel} scope="col">
              {t('模型', 'Model')}
            </th>
            <th className={styles.colPrice} scope="col">
              {t('官方直连', 'Official')}
            </th>
            <th className={styles.colPrice} scope="col">
              {t('走本站', 'Via us')}
            </th>
          </tr>
        </thead>
        <tbody>
          {PRICE_ROWS.map((row) => {
            const officialBlended = blendedPrice(row.official)
            const ourBlended = blendedPrice(row.ours)
            const ratio = officialBlended === 0 ? 0 : ourBlended / officialBlended

            return (
              <tr key={row.id} className={styles.row}>
                <th className={styles.modelCell} scope="row">
                  <ModelIcon icon={row.icon} name={row.name} />
                  <span className={styles.modelText}>
                    <span className={styles.modelName}>{row.name}</span>
                    <span className={styles.modelProvider}>{row.provider}</span>
                  </span>
                </th>

                <td className={styles.priceCell}>
                  <span className={styles.officialPrice}>
                    {pricePair(row.official.input, row.official.output, rate)}
                  </span>
                </td>

                <td className={styles.priceCell}>
                  <span className={styles.oursInner}>
                    <span className={styles.ourPrice}>
                      {pricePair(row.ours.input, row.ours.output, rate)}
                    </span>
                    <span className={styles.discount}>
                      {Math.round((1 - ratio) * 100)}% {t('示例差额', 'saved')}
                    </span>
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <p className={styles.caption}>
        {t('以上是演示数据，不是实际报价或优惠承诺。综合单价按', 'Sample data for illustration — not a quote. Blended price weights')}{' '}
        {t(...INPUT_SHARE_LABEL)}{t('折算。', '.')}
        <Link to="/models">{t('查看实时模型价格', 'See live model prices')}</Link>
      </p>

      <div className={styles.calculator}>
        <div className={styles.calcHead}>
          <h3 className={styles.calcTitle}>{t('示例用量计算', 'Monthly cost estimate')}</h3>
          <span className={styles.calcValue}>
            <span className={styles.calcNumber}>{volume}</span>
            <span className={styles.calcUnit}>{t('M token / 月', 'M tokens / mo')}</span>
          </span>
        </div>

        <Slider
          className={styles.slider}
          min={VOLUME_MIN}
          max={VOLUME_MAX}
          value={volume}
          onChange={setVolume}
          tooltip={{ formatter: (value) => `${value}M` }}
          aria-label={t('每月用量', 'Monthly usage')}
        />

        <dl className={styles.result}>
          <div className={styles.resultRow}>
            <dt>{t('官方直连', 'Official')}</dt>
            <dd className={styles.resultOfficial}>{formatMoney(comparison.official * rate, '¥', 0)}</dd>
          </div>
          <div className={`${styles.resultRow} ${styles.resultHero}`}>
            <dt>{t('走本站', 'Via us')}</dt>
            <dd className={styles.resultOurs}>
              {formatMoney(comparison.ours * rate, '¥', 0)}
              <span className={styles.savedTag}>
                {t('示例差额', 'Saved')} {formatMoney(comparison.saved * rate, '¥', 0)} ·{' '}
                {formatPercent(comparison.savedRatio, 0)}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
