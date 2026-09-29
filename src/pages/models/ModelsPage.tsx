import { AppstoreOutlined, CopyOutlined, SearchOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { App as AntdApp, Alert, Button, Empty, Input, Popover, Segmented, Select, Skeleton } from 'antd'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { ModelIcon } from '@/features/landing/components/ModelIcon'
import { usePricing } from '@/features/models/api'
import { officialPriceOf, useOfficialPricing } from '@/features/models/official-pricing'
import { intelligenceOf, sortByIntelligence, useIntelligence } from '@/features/models/intelligence'
import { formatUsdAsCny, usdExchangeRate, useQuotaFormat } from '@/features/console/quota'
import { useSystemStatus } from '@/features/auth/hooks'
import type { QuotaFormat } from '@/features/console/quota'
import { matchesGroup, modelPrice } from '@/features/models/pricing'
import type { ModelPrice, PricingModel, PricingVendor } from '@/features/models/pricing'
import { usePageTitle } from '@/shared/hooks/use-page-title'
import { formatMoney } from '@/shared/lib/format'
import { useT } from '@/shared/i18n'
import { EndpointTags } from '@/features/models/EndpointTags'

import styles from './ModelsPage.module.css'

const EMPTY_VENDORS: PricingVendor[] = []

function PriceLabel({ price, format, t }: { price: ModelPrice; format: QuotaFormat; t: (zh: string, en: string) => string }) {
  if (price.kind === 'dynamic') return <span className={styles.muted}>{t('动态计费，请以实际用量为准', 'Dynamic billing — based on actual usage')}</span>
  if (price.kind === 'unknown') return <span className={styles.muted}>{t('按实际选择的分组计费', 'Billed by the selected group')}</span>
  if (price.kind === 'request') return <span><strong>{formatUsdAsCny(price.each, format)}</strong><small> {t('/ 次', '/ call')}</small></span>
  return (
    <dl className={styles.priceStack}>
      <dt>{t('输入', 'Input')}</dt>
      <dd>{formatUsdAsCny(price.input, format)}</dd>
      <dt>{t('输出', 'Output')}</dt>
      <dd>{formatUsdAsCny(price.output, format)}</dd>
    </dl>
  )
}

/** 「全部分组」时：每个可用分组一行，列出该分组下的输入/输出价 */
function GroupPrices({ rows, format, t }: { rows: { name: string; ratio?: number; price: ModelPrice }[]; format: QuotaFormat; t: (zh: string, en: string) => string }) {
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
                <span><small>{t('入', 'In')}</small> {formatUsdAsCny(price.input, format)}</span>
                <span><small>{t('出', 'Out')}</small> {formatUsdAsCny(price.output, format)}</span>
              </>
            ) : price.kind === 'request' ? (
              <span>{formatUsdAsCny(price.each, format)}<small> {t('/ 次', '/ call')}</small></span>
            ) : (
              <span className={styles.muted}>{price.kind === 'dynamic' ? t('动态计费', 'Dynamic') : t('以实际为准', 'As used')}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

type GroupPriceRow = { name: string; ratio?: number; price: ModelPrice }

/** 用来比较贵贱的一个数：按 token 计费取「输入+输出」，按次取单次价 */
function priceWeight(price: ModelPrice): number {
  if (price.kind === 'tokens') return price.input + price.output
  if (price.kind === 'request') return price.each
  return Number.POSITIVE_INFINITY
}

/** 「全部分组」时只显示最便宜的分组，其余分组收进悬浮明细 */
function CheapestPrice({ rows, format, t }: { rows: GroupPriceRow[]; format: QuotaFormat; t: (zh: string, en: string) => string }) {
  const priced = rows.filter((row) => Number.isFinite(priceWeight(row.price)))
  if (!priced.length) return <PriceLabel price={rows[0]?.price ?? { kind: 'unknown' }} format={format} t={t} />
  const cheapest = priced.reduce((best, row) => (priceWeight(row.price) < priceWeight(best.price) ? row : best))
  return (
    <div className={styles.cheapest}>
      <PriceLabel price={cheapest.price} format={format} t={t} />
      <span className={styles.cheapestNote}>
        {rows.length > 1 ? t(`最低价 · ${cheapest.name}`, `Lowest · ${cheapest.name}`) : cheapest.name}
        {rows.length > 1 ? (
          <Popover trigger={['hover', 'click']} title={t('各分组价格', 'Price by group')} content={<GroupPrices rows={rows} format={format} t={t} />}>
            <button type="button" className={styles.moreGroups}>{t(`共 ${rows.length} 个分组`, `${rows.length} groups`)}</button>
          </Popover>
        ) : null}
      </span>
    </div>
  )
}

/** 官方参考价 + 本站便宜多少 */
function OfficialPrice({ official, ours, rate, t }: { official?: { input?: number | null; output?: number | null }; ours: ModelPrice[]; rate: number; t: (zh: string, en: string) => string }) {
  if (official?.input == null || official.output == null) return <span className={styles.muted}>{t('暂无官方价', 'No official price')}</span>
  const tokens = ours.filter((price) => price.kind === 'tokens')
  const best = tokens.length ? Math.min(...tokens.map(priceWeight)) : undefined
  const officialSum = official.input + official.output
  const saving = best !== undefined && officialSum > 0 ? Math.round((1 - best / officialSum) * 100) : undefined
  return (
    <div className={styles.cheapest}>
      <dl className={styles.priceStack}>
        <dt>{t('输入', 'Input')}</dt><dd>{formatMoney(official.input * rate)}</dd>
        <dt>{t('输出', 'Output')}</dt><dd>{formatMoney(official.output * rate)}</dd>
      </dl>
      {saving !== undefined && saving >= 1 ? <span className={styles.saving}>{t(`本站便宜 ${saving}%`, `${saving}% cheaper here`)}</span> : null}
    </div>
  )
}

function IntelligenceCell({ score }: { score?: number }) {
  if (score === undefined) return <span className={styles.muted}>—</span>
  return (
    <div className={styles.iq} aria-label={`IQ ${score}`}>
      <strong>{score}</strong>
      <span className={styles.iqTrack} aria-hidden="true">
        <span className={styles.iqBar} style={{ width: `${score}%` }} />
      </span>
    </div>
  )
}

function vendorName(model: PricingModel, vendors: PricingVendor[], other: string): string {
  return vendors.find((vendor) => vendor.id === model.vendor_id)?.name || model.owner_by || other
}

export function ModelsPage() {
  const t = useT()
  usePageTitle(t('模型广场', 'Models'))
  const { message } = AntdApp.useApp()
  const pricing = usePricing()
  const format = useQuotaFormat()
  const systemStatus = useSystemStatus()
  const officialRate = usdExchangeRate(systemStatus.data)
  const [showOfficial, setShowOfficial] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [groupChoice, setGroupChoice] = useState('all')
  const [vendorChoice, setVendorChoice] = useState('all')
  const [sortBy, setSortBy] = useState<'iq' | 'name'>('iq')
  // 手机默认卡片，电脑默认表格；用户选过就记住
  const [view, setViewState] = useState<'table' | 'card'>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('sparkai.modelsView') : null
    if (saved === 'table' || saved === 'card') return saved
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches ? 'card' : 'table'
  })
  const setView = (next: 'table' | 'card') => {
    setViewState(next)
    window.localStorage.setItem('sparkai.modelsView', next)
  }
  // 卡片模式默认带官方价；表格模式点「对比官方」才显示
  const officialShown = showOfficial || view === 'card'
  const officialPricing = useOfficialPricing(officialShown)
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
      const vendor = vendorName(model, vendors, t('其他', 'Other'))
      if (vendorChoice !== 'all' && vendor !== vendorChoice) return false
      return !search || `${model.model_name} ${model.description ?? ''} ${vendor}`.toLowerCase().includes(search)
    })
    return sortBy === 'iq'
      ? sortByIntelligence(matched, intelligence.data)
      : [...matched].sort((a, b) => a.model_name.localeCompare(b.model_name))
  }, [data, group, keyword, vendorChoice, vendors, sortBy, intelligence.data, t])

  async function copyModel(id: string) {
    try {
      await navigator.clipboard.writeText(id)
      message.success(t('调用名称已复制', 'Model ID copied'))
    } catch {
      message.error(t('复制失败，请手动选中名称', 'Copy failed — select the ID manually'))
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1>{t('模型广场', 'Models')}</h1>
          <p>{t('按可用分组查看当前开放的模型和实际价格，不展示示例报价。', 'Browse available models and real prices by billing group. No sample rates.')}</p>
        </div>
        {data ? <span className={styles.count}>{t(`${data.data.length} 个可用模型`, `${data.data.length} models available`)}</span> : null}
      </div>

      {pricing.isError ? (
        <Alert type="error" showIcon title={t('模型列表暂时无法获取', 'Could not load the model list')} action={<Button size="small" onClick={() => void pricing.refetch()}>{t('重试', 'Retry')}</Button>} />
      ) : pricing.isPending ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : data ? (
        <>
          <div className={styles.filters}>
            <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} prefix={<SearchOutlined />} placeholder={t('搜索模型或厂商', 'Search models or vendors')} aria-label={t('搜索模型或厂商', 'Search models or vendors')} allowClear />
            <Select
              aria-label={t('选择计费分组', 'Billing group')}
              value={group}
              onChange={setGroupChoice}
              placeholder={t('可用分组', 'Groups')}
              options={[
                { label: t('全部分组', 'All groups'), value: 'all' },
                ...groups.map(([name, desc]) => ({
                  label: `${desc || name}${typeof data.group_ratio?.[name] === 'number' ? ` · ${t(`${data.group_ratio[name]} 倍`, `×${data.group_ratio[name]}`)}` : ''}`,
                  value: name,
                })),
              ]}
              disabled={!groups.length}
            />
            <Select
              aria-label={t('筛选厂商', 'Vendor')}
              value={vendorChoice}
              onChange={setVendorChoice}
              options={[{ label: t('全部厂商', 'All vendors'), value: 'all' }, ...Array.from(new Set(data.data.map((model) => vendorName(model, vendors, t('其他', 'Other'))))).sort().map((name) => ({ label: name, value: name }))]}
            />
            <Select
              aria-label={t('排序方式', 'Sort by')}
              value={sortBy}
              onChange={setSortBy}
              options={[{ label: t('智力从高到低', 'Intelligence, high to low'), value: 'iq' }, { label: t('按名称', 'Name'), value: 'name' }]}
            />
          </div>
          {group === 'auto' ? <p className={styles.hint}>{t('自动分组会在调用时选定，最终价格以实际命中的分组为准。', 'Auto groups are chosen at call time; the final price follows the group actually matched.')}</p> : null}
          <div className={styles.officialControl}>
            <Segmented
              value={view}
              onChange={(value) => setView(value as 'table' | 'card')}
              options={[
                { value: 'table', icon: <UnorderedListOutlined />, label: t('表格', 'Table') },
                { value: 'card', icon: <AppstoreOutlined />, label: t('卡片', 'Cards') },
              ]}
            />
            {view === 'table' ? <Button type={showOfficial ? 'primary' : 'default'} onClick={() => setShowOfficial((shown) => !shown)} aria-pressed={showOfficial}>
              {showOfficial ? t('收起官方价', 'Hide official prices') : t('对比官方', 'Compare official prices')}
            </Button> : null}
            {officialShown && officialPricing.data ? <span>{t(`官方价更新于 ${new Date(officialPricing.data.updatedAt).toLocaleDateString('zh-CN')}`, `Official prices updated ${new Date(officialPricing.data.updatedAt).toLocaleDateString('en-US')}`)}</span> : null}
          </div>
          {officialShown && officialPricing.isError ? <Alert className={styles.officialAlert} type="warning" showIcon title={t('官方价格暂时无法读取', 'Official prices are temporarily unavailable')} /> : null}
          {visible.length === 0 ? (
            <div className={styles.empty}>
              <Empty description={data.data.length ? t('没有符合筛选条件的模型，换个条件试试', 'No models match these filters — try different ones') : t('当前还没有开放的模型，请稍后再来查看', 'No models are open yet — check back later')} />
            </div>
          ) : (
            (() => {
              const rowsOf = (model: PricingModel): GroupPriceRow[] => priceGroups
                .filter((name) => matchesGroup(model, name))
                .map((name) => ({ name: data.usable_group[name] || name, ratio: data.group_ratio?.[name], price: modelPrice(model, data.group_ratio?.[name]) }))
              const ourPrice = (model: PricingModel): ReactNode => group === 'all'
                ? <CheapestPrice format={format} t={t} rows={rowsOf(model)} />
                : <PriceLabel format={format} t={t} price={modelPrice(model, data.group_ratio?.[group])} />
              const officialPrice = (model: PricingModel): ReactNode => (
                <OfficialPrice
                  t={t}
                  rate={officialRate}
                  official={officialPriceOf(model.model_name, officialPricing.data)}
                  ours={group === 'all' ? rowsOf(model).map((row) => row.price) : [modelPrice(model, data.group_ratio?.[group])]}
                />
              )
              const icon = (model: PricingModel) => <ModelIcon icon={model.icon || vendors.find((vendor) => vendor.id === model.vendor_id)?.icon} name={model.model_name} />
              const copyBtn = (model: PricingModel) => <Button type="text" size="small" aria-label={t(`复制 ${model.model_name} 的调用名称`, `Copy model ID ${model.model_name}`)} icon={<CopyOutlined />} onClick={() => void copyModel(model.model_name)} />
              const endpointsOf = (model: PricingModel) => <EndpointTags endpoints={showAllEndpointTypes ? model.supported_endpoint_types ?? [] : (model.supported_endpoint_types ?? []).slice(0, 3)} />
              const ourUnit = <span className={styles.thUnit}>{t('元 / 百万 token', 'USD / M tokens')}</span>
              const refUnit = <span className={styles.thUnit}>{t('元 / 百万 token', 'CNY / M tokens')}</span>

              if (view === 'card') return (
                <div className={styles.cards}>
                  {visible.map((model) => (
                    <article key={model.model_name} className={styles.card}>
                      <header className={styles.cardHead}>
                        {icon(model)}
                        <div className={styles.modelText}>
                          <strong>{model.model_name}</strong>
                          <span>{vendorName(model, vendors, t('其他', 'Other'))}</span>
                        </div>
                        {copyBtn(model)}
                      </header>
                      {model.description ? <p className={styles.cardDesc}>{model.description}</p> : null}
                      <div className={styles.cardMeta}>
                        <IntelligenceCell score={intelligenceOf(intelligence.data, model.model_name)} />
                        {endpointsOf(model)}
                      </div>
                      <div className={styles.cardPrice}>
                        <div>
                          <span className={styles.cardLabel}>{t('本站价格', 'Our price')}{ourUnit}</span>
                          {ourPrice(model)}
                        </div>
                        {officialShown ? (
                          <div>
                            <span className={styles.cardLabel}>{t('官方价格', 'Official price')}{refUnit}</span>
                            {officialPrice(model)}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )

              return (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th scope="col">{t('模型', 'Model')}</th>
                        <th scope="col">{t('智力', 'IQ')}</th>
                        <th scope="col">{t('厂商与能力', 'Vendor & capabilities')}</th>
                        <th scope="col">{t('本站价格', 'Our price')}{ourUnit}</th>
                        {showOfficial ? <th scope="col">{t('官方价格', 'Official price')}{refUnit}</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((model) => (
                        <tr key={model.model_name}>
                          <td>
                            <div className={styles.modelCell}>
                              {icon(model)}
                              <div className={styles.modelText}>
                                <strong>{model.model_name}</strong>
                                {model.description ? <span>{model.description}</span> : null}
                              </div>
                              {copyBtn(model)}
                            </div>
                          </td>
                          <td><IntelligenceCell score={intelligenceOf(intelligence.data, model.model_name)} /></td>
                          <td>
                            <div className={styles.meta}>
                              <span className={styles.vendorName}>{vendorName(model, vendors, t('其他', 'Other'))}</span>
                              {endpointsOf(model)}
                            </div>
                          </td>
                          <td className={styles.price}>{ourPrice(model)}</td>
                          {showOfficial ? <td className={styles.price}>{officialPrice(model)}</td> : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })()
          )}
          <p className={styles.footnote}>{t('智力为本站综合评估分（0–100），仅供选型参考。本站价格按当前语言显示；官方价格按后台汇率换算为人民币。实际价格以请求结算为准。', 'IQ scores are our own 0–100 rating for reference only. Our prices follow the selected language; official prices are converted to CNY using the current exchange rate. Actual billing follows request settlement.')}</p>
        </>
      ) : null}
    </div>
  )
}
