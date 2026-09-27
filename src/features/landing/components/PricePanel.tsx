import { Slider } from 'antd'
import { useMemo, useState } from 'react'

import { ModelIcon } from '@/features/landing/components/ModelIcon'
import { PRICE_ROWS } from '@/features/landing/data'
import { blendedPrice, compareMonthlyCost } from '@/features/landing/pricing'
import { formatMoney, formatPercent } from '@/shared/lib/format'

import styles from './PricePanel.module.css'

/** 综合单价里输入占的比例，与 pricing.ts 的口径保持一致 */
const INPUT_SHARE_LABEL = '输入 3 : 输出 1'

/** 用量滑块的档位：单位百万 token */
const VOLUME_MIN = 1
const VOLUME_MAX = 500
const VOLUME_DEFAULT = 130

function unitText(value: number): string {
  return formatMoney(value, '$', 2)
}

/** 每百万 token 的单价，用一行紧凑文字表示 */
function pricePair(input: number, output: number): string {
  return `${unitText(input)} / ${unitText(output)}`
}

/**
 * 右侧价格面板：上面是官方与本站的单价对照，下面是实时计算器。
 * 单价口径统一为「美元 / 百万 token」，输入与输出分开列。
 */
export function PricePanel() {
  const [volume, setVolume] = useState(VOLUME_DEFAULT)

  const comparison = useMemo(() => compareMonthlyCost(PRICE_ROWS, volume), [volume])

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>价格对比</h2>
        <span className={styles.unitNote}>美元 / 百万 token · 输入 / 输出</span>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.colModel} scope="col">
              模型
            </th>
            <th className={styles.colPrice} scope="col">
              官方直连
            </th>
            <th className={styles.colPrice} scope="col">
              走本站
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
                  <ModelIcon modelId={row.id} name={row.name} />
                  <span className={styles.modelText}>
                    <span className={styles.modelName}>{row.name}</span>
                    <span className={styles.modelProvider}>{row.provider}</span>
                  </span>
                </th>

                <td className={styles.priceCell}>
                  <span className={styles.officialPrice}>
                    {pricePair(row.official.input, row.official.output)}
                  </span>
                  <span className={styles.barTrack} aria-hidden="true">
                    <span
                      className={styles.barOfficial}
                      style={{ width: `${(officialBlended / maxBlended(officialBlended, ourBlended)) * 100}%` }}
                    />
                  </span>
                </td>

                <td className={styles.priceCell}>
                  <span className={styles.oursInner}>
                    <span className={styles.ourPrice}>
                      {pricePair(row.ours.input, row.ours.output)}
                    </span>
                    <span className={styles.discount}>
                      {Math.round((1 - ratio) * 100)}% off
                    </span>
                  </span>
                  <span className={styles.barTrack} aria-hidden="true">
                    <span
                      className={styles.barOurs}
                      style={{ width: `${(ourBlended / maxBlended(officialBlended, ourBlended)) * 100}%` }}
                    />
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <p className={styles.caption}>
        综合单价按 {INPUT_SHARE_LABEL} 折算，仅用于横向比较；实际按调用时的真实用量计费。
      </p>

      <div className={styles.calculator}>
        <div className={styles.calcHead}>
          <h3 className={styles.calcTitle}>算一下你每月能省多少</h3>
          <span className={styles.calcValue}>
            <span className={styles.calcNumber}>{volume}</span>
            <span className={styles.calcUnit}>M token / 月</span>
          </span>
        </div>

        <Slider
          className={styles.slider}
          min={VOLUME_MIN}
          max={VOLUME_MAX}
          value={volume}
          onChange={setVolume}
          tooltip={{ formatter: (value) => `${value}M` }}
          aria-label="每月用量"
        />

        <dl className={styles.result}>
          <div className={styles.resultRow}>
            <dt>官方直连</dt>
            <dd className={styles.resultOfficial}>{formatMoney(comparison.official, '$', 0)}</dd>
          </div>
          <div className={`${styles.resultRow} ${styles.resultHero}`}>
            <dt>走本站</dt>
            <dd className={styles.resultOurs}>
              {formatMoney(comparison.ours, '$', 0)}
              <span className={styles.savedTag}>
                省 {formatMoney(comparison.saved, '$', 0)} ·{' '}
                {formatPercent(comparison.savedRatio, 0)}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

/** 同一条基准：官方与本站里较大的那个，用来算进度条宽度 */
function maxBlended(official: number, ours: number): number {
  return Math.max(official, ours, 0.0001)
}
