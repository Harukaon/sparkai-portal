import { CopyOutlined, SearchOutlined } from '@ant-design/icons'
import { App as AntdApp, Alert, Button, Empty, Input, Select, Skeleton, Tag } from 'antd'
import { useMemo, useState } from 'react'

import { ModelIcon } from '@/features/landing/components/ModelIcon'
import { usePricing } from '@/features/models/api'
import { intelligenceOf, sortByIntelligence, useIntelligence } from '@/features/models/intelligence'
import { formatUsdAsCny, useQuotaFormat } from '@/features/console/quota'
import type { QuotaFormat } from '@/features/console/quota'
import { matchesGroup, modelPrice } from '@/features/models/pricing'
import type { ModelPrice, PricingModel, PricingVendor } from '@/features/models/pricing'
import { usePageTitle } from '@/shared/hooks/use-page-title'

import styles from './ModelsPage.module.css'

const EMPTY_VENDORS: PricingVendor[] = []

function PriceLabel({ price, format }: { price: ModelPrice; format: QuotaFormat }) {
  if (price.kind === 'dynamic') return <span className={styles.muted}>动态计费，请以实际用量为准</span>
  if (price.kind === 'unknown') return <span className={styles.muted}>按实际选择的分组计费</span>
  if (price.kind === 'request') return <span><strong>{formatUsdAsCny(price.each, format)}</strong><small> / 次</small></span>
  return (
    <dl className={styles.priceStack}>
      <dt>输入</dt>
      <dd>{formatUsdAsCny(price.input, format)}</dd>
      <dt>输出</dt>
      <dd>{formatUsdAsCny(price.output, format)}</dd>
    </dl>
  )
}

/** 「全部分组」时：每个可用分组一行，列出该分组下的输入/输出价 */
function GroupPrices({ rows, format }: { rows: { name: string; ratio?: number; price: ModelPrice }[]; format: QuotaFormat }) {
  return (
    <dl className={styles.groupPrices}>
      {rows.map(({ name, ratio, price }) => (
        <div key={name} className={styles.groupRow}>
          <dt>
            {name}
            {ratio !== undefined ? <span className={styles.ratio}>×{ratio}</span> : null}
          </dt>
          <dd>
            {price.kind === 'tokens' ? (
              <>
                <span><small>入</small> {formatUsdAsCny(price.input, format)}</span>
                <span><small>出</small> {formatUsdAsCny(price.output, format)}</span>
              </>
            ) : price.kind === 'request' ? (
              <span>{formatUsdAsCny(price.each, format)}<small> / 次</small></span>
            ) : (
              <span className={styles.muted}>{price.kind === 'dynamic' ? '动态计费' : '以实际为准'}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function IntelligenceCell({ score }: { score?: number }) {
  if (score === undefined) return <span className={styles.muted}>—</span>
  return (
    <div className={styles.iq} aria-label={`智力 ${score} 分`}>
      <strong>{score}</strong>
      <span className={styles.iqTrack} aria-hidden="true">
        <span className={styles.iqBar} style={{ width: `${score}%` }} />
      </span>
    </div>
  )
}

function vendorName(model: PricingModel, vendors: PricingVendor[]): string {
  return vendors.find((vendor) => vendor.id === model.vendor_id)?.name || model.owner_by || '其他'
}

export function ModelsPage() {
  usePageTitle('模型广场')
  const { message } = AntdApp.useApp()
  const pricing = usePricing()
  const format = useQuotaFormat()
  const [keyword, setKeyword] = useState('')
  const [groupChoice, setGroupChoice] = useState('all')
  const [vendorChoice, setVendorChoice] = useState('all')
  const [sortBy, setSortBy] = useState<'iq' | 'name'>('iq')
  const intelligence = useIntelligence()
  const showAllEndpointTypes = import.meta.env.DEV && typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('previewEndpoints')

  const data = pricing.data
  const groups = Object.entries(data?.usable_group ?? {})
  // 默认「全部分组」不筛选；选了具体分组才按分组过滤、按该分组倍率算价
  const group = groups.some(([name]) => name === groupChoice) ? groupChoice : 'all'
  const priceGroups = groups.map(([name]) => name).filter((name) => name !== 'auto')
  const vendors = data?.vendors ?? EMPTY_VENDORS

  const visible = useMemo(() => {
    const search = keyword.trim().toLowerCase()
    const matched = (data?.data ?? []).filter((model) => {
      if (group === 'all') {
        // 不按分组筛选
      } else if (group === 'auto') {
        if (!model.enable_groups.includes('all') && !(data?.auto_groups ?? []).some((candidate) => matchesGroup(model, candidate))) return false
      } else if (group && !matchesGroup(model, group)) return false
      const vendor = vendorName(model, vendors)
      if (vendorChoice !== 'all' && vendor !== vendorChoice) return false
      return !search || `${model.model_name} ${model.description ?? ''} ${vendor}`.toLowerCase().includes(search)
    })
    return sortBy === 'iq'
      ? sortByIntelligence(matched, intelligence.data)
      : [...matched].sort((a, b) => a.model_name.localeCompare(b.model_name))
  }, [data, group, keyword, vendorChoice, vendors, sortBy, intelligence.data])

  async function copyModel(id: string) {
    try {
      await navigator.clipboard.writeText(id)
      message.success('调用名称已复制')
    } catch {
      message.error('复制失败，请手动选中名称')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1>模型广场</h1>
          <p>按可用分组查看当前开放的模型和实际价格，不展示示例报价。</p>
        </div>
        {data ? <span className={styles.count}>{data.data.length} 个可用模型</span> : null}
      </div>

      {pricing.isError ? (
        <Alert type="error" showIcon title="模型列表暂时无法获取" action={<Button size="small" onClick={() => void pricing.refetch()}>重试</Button>} />
      ) : pricing.isPending ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : data ? (
        <>
          <div className={styles.filters}>
            <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} prefix={<SearchOutlined />} placeholder="搜索模型或厂商" aria-label="搜索模型或厂商" allowClear />
            <Select
              aria-label="选择计费分组"
              value={group}
              onChange={setGroupChoice}
              placeholder="可用分组"
              options={[
                { label: '全部分组', value: 'all' },
                ...groups.map(([name, desc]) => ({
                  label: `${desc || name}${typeof data.group_ratio?.[name] === 'number' ? ` · ${data.group_ratio[name]} 倍` : ''}`,
                  value: name,
                })),
              ]}
              disabled={!groups.length}
            />
            <Select
              aria-label="筛选厂商"
              value={vendorChoice}
              onChange={setVendorChoice}
              options={[{ label: '全部厂商', value: 'all' }, ...Array.from(new Set(data.data.map((model) => vendorName(model, vendors)))).sort().map((name) => ({ label: name, value: name }))]}
            />
            <Select
              aria-label="排序方式"
              value={sortBy}
              onChange={setSortBy}
              options={[{ label: '智力从高到低', value: 'iq' }, { label: '按名称', value: 'name' }]}
            />
          </div>
          {group === 'auto' ? <p className={styles.hint}>自动分组会在调用时选定，最终价格以实际命中的分组为准。</p> : null}
          {visible.length === 0 ? (
            <div className={styles.empty}>
              <Empty description={data.data.length ? '没有符合筛选条件的模型，换个条件试试' : '当前还没有开放的模型，请稍后再来查看'} />
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th scope="col">模型</th><th scope="col">智力</th><th scope="col">厂商与能力</th><th scope="col">本站价格<span className={styles.thUnit}>元 / 百万 token</span></th></tr></thead>
                <tbody>
                  {visible.map((model) => (
                    <tr key={model.model_name}>
                      <td>
                        <div className={styles.modelCell}>
                          <ModelIcon icon={model.icon || vendors.find((vendor) => vendor.id === model.vendor_id)?.icon} name={model.model_name} />
                          <div className={styles.modelText}>
                            <strong>{model.model_name}</strong>
                            {model.description ? <span>{model.description}</span> : null}
                          </div>
                          <Button type="text" size="small" aria-label={`复制 ${model.model_name} 的调用名称`} icon={<CopyOutlined />} onClick={() => void copyModel(model.model_name)} />
                        </div>
                      </td>
                      <td><IntelligenceCell score={intelligenceOf(intelligence.data, model.model_name)} /></td>
                      <td>
                        <div className={styles.meta}><span>{vendorName(model, vendors)}</span>
                          {(showAllEndpointTypes ? model.supported_endpoint_types ?? [] : (model.supported_endpoint_types ?? []).slice(0, 3)).map((endpoint) => <Tag key={endpoint}>{endpoint}</Tag>)}
                        </div>
                      </td>
                      <td className={styles.price}>{group === 'all' ? (
                        <GroupPrices
                          format={format}
                          rows={priceGroups
                            .filter((name) => matchesGroup(model, name))
                            .map((name) => ({ name: data.usable_group[name] || name, ratio: data.group_ratio?.[name], price: modelPrice(model, data.group_ratio?.[name]) }))}
                        />
                      ) : (
                        <PriceLabel format={format} price={modelPrice(model, data.group_ratio?.[group])} />
                      )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className={styles.footnote}>智力为本站综合评估分（0–100），仅供选型参考。价格按后台汇率换算为人民币显示；倍率、分组及动态计费规则以实际请求结算为准。</p>
        </>
      ) : null}
    </div>
  )
}
