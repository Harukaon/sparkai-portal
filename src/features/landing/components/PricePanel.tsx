import { Skeleton, Slider } from 'antd'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useQuotaFormat } from '@/features/console/quota'
import { ModelIcon } from '@/features/landing/components/ModelIcon'
import { discountLabel, priceRatio, useLivePriceRows } from '@/features/landing/live-prices'
import { compareMonthlyCost } from '@/features/landing/pricing'
import { useT } from '@/shared/i18n'
import { formatMoney, formatPercent } from '@/shared/lib/format'

import styles from './PricePanel.module.css'

/** 综合单价里输入占的比例，与 pricing.ts 的口径保持一致 */
const INPUT_SHARE_LABEL: [string, string] = ['输入 3 : 输出 1', 'input 3 : output 1']

/** 用量滑块的档位：单位百万 token */
const VOLUME_MIN = 1
const VOLUME_MAX = 500
const VOLUME_DEFAULT = 130

/** 每百万 token 的单价，用一行紧凑文字表示（数值已是当前显示币种） */
function pricePair(input: number, output: number, symbol: string): string {
  return `${formatMoney(input, symbol, 2)} / ${formatMoney(output, symbol, 2)}`
}

/**
 * 右侧价格面板：上面是官方与本站的单价对照，下面是实时计算器。
 * 价格来自线上实时数据：本站价 = 模型价 × 最低分组倍率，官方价取官方价表。
 * 中文显示人民币，英文显示美元，输入与输出分开列。
 */
export function PricePanel() {
  const t = useT()
  const [volume, setVolume] = useState(VOLUME_DEFAULT)
  const { symbol } = useQuotaFormat()
  const { rows, cny, isLoading } = useLivePriceRows()

  const comparison = useMemo(() => compareMonthlyCost(rows, volume), [rows, volume])

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>{t('价格对比', 'Price comparison')}</h2>
        <span className={styles.unitNote}>{t('实时价格 · 元 / 百万 token', 'Live prices · USD / M tokens')}</span>
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
          {isLoading ? (
            <tr>
              <td colSpan={3}>
                <Skeleton active title={false} paragraph={{ rows: 4 }} />
              </td>
            </tr>
          ) : null}
          {rows.map((row) => {
            const label = discountLabel(priceRatio(row), cny)

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
                    {pricePair(row.official.input, row.official.output, symbol)}
                  </span>
                </td>

                <td className={styles.priceCell}>
                  <span className={styles.oursInner}>
                    <span className={styles.ourPrice}>
                      {pricePair(row.ours.input, row.ours.output, symbol)}
                    </span>
                    {label ? <span className={styles.discount}>{label}</span> : null}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <p className={styles.caption}>
        {t('价格实时读取，折扣已含在本站价里。折扣按综合单价（', 'Live prices, discount already included. Discount uses a blended price (')}
        {t(...INPUT_SHARE_LABEL)}
        {t('）计算，实际以模型广场为准。', ') — see the model catalog for details. ')}
        <Link to="/models">{t('查看全部模型价格', 'See all model prices')}</Link>
      </p>

      <div className={styles.calculator}>
        <div className={styles.calcHead}>
          <h3 className={styles.calcTitle}>{t('用量估算', 'Monthly cost estimate')}</h3>
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
            <dd className={styles.resultOfficial}>{formatMoney(comparison.official, symbol, 0)}</dd>
          </div>
          <div className={`${styles.resultRow} ${styles.resultHero}`}>
            <dt>{t('走本站', 'Via us')}</dt>
            <dd className={styles.resultOurs}>
              {formatMoney(comparison.ours, symbol, 0)}
              <span className={styles.savedTag}>
                {t('预计节省', 'Saved')} {formatMoney(comparison.saved, symbol, 0)} ·{' '}
                {formatPercent(comparison.savedRatio, 0)}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
