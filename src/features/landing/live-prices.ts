import { useMemo } from 'react'

import { useQuotaFormat } from '@/features/console/quota'
import { usePricing } from '@/features/models/api'
import { officialPriceFor, officialPriceOf, useOfficialPricing } from '@/features/models/official-pricing'
import type { OfficialModelPrice, OfficialPricing } from '@/features/models/official-pricing'
import { modelPrice } from '@/features/models/pricing'
import type { PricingModel, PricingResponse } from '@/features/models/pricing'

import { blendedPrice } from './pricing'
import type { PriceRow, UnitPrice } from './types'

/** 首页最多展示几个模型：保持一屏，不出现滚动条 */
export const MAX_ROWS = 4

/** 优先展示的模型系列（按模型名前缀，顺序即展示顺序）；不够再补其他有官方价的模型 */
const FEATURED_PREFIXES = ['deepseek', 'claude', 'gemini', 'glm', 'minimax']

/** 官方价折算成当前显示币种：中文优先用人民币官方价，英文优先用美元官方价 */
export function officialInDisplay(price: OfficialModelPrice | undefined, rate: number, cny: boolean): UnitPrice | undefined {
  if (!price) return undefined
  const pick = (usd?: number, yuan?: number): number | undefined => {
    if (cny) return yuan ?? (usd != null ? usd * rate : undefined)
    return usd ?? (yuan != null ? yuan / rate : undefined)
  }
  const input = pick(price.input, price.inputCny)
  const output = pick(price.output, price.outputCny)
  return input != null && output != null ? { input, output } : undefined
}

interface BuildArgs {
  pricing: Pick<PricingResponse, 'data' | 'vendors' | 'group_ratio'>
  official: OfficialPricing
  /** 当前显示币种相对美元的汇率：人民币 = 后台汇率，美元 = 1 */
  rate: number
  cny: boolean
}

/** 模型所有开放分组里倍率最低的一个（用户能选到的最低价） */
function lowestGroupRatio(model: PricingModel, groupRatio: Record<string, number>): number | undefined {
  const ratios = model.enable_groups
    .map((group) => groupRatio[group])
    .filter((ratio): ratio is number => typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0)
  return ratios.length ? Math.min(...ratios) : undefined
}

/**
 * 用线上真实数据生成首页价格对比：本站价 = 后台模型价 × 最低分组倍率，官方价取官方价表。
 * 只收按 token 计费且查得到官方价的模型。
 */
export function buildPriceRows({ pricing, official, rate, cny }: BuildArgs): PriceRow[] {
  const candidates: PriceRow[] = []
  for (const model of pricing.data) {
    const ratio = lowestGroupRatio(model, pricing.group_ratio)
    if (ratio === undefined) continue
    const ours = modelPrice(model, ratio)
    const base = ours.kind === 'tokens' ? ours : ours.kind === 'tiers' ? ours.tiers[0] : undefined
    if (!base) continue
    const officialPrice = officialInDisplay(officialPriceOf(model.model_name, official), rate, cny)
    if (!officialPrice || blendedPrice(officialPrice) <= 0) continue
    const vendor = pricing.vendors.find((item) => item.id === model.vendor_id)
    candidates.push({
      id: model.model_name,
      name: officialPriceFor(model.model_name, official.models)?.name ?? model.model_name,
      provider: vendor?.name || model.owner_by || '',
      icon: model.icon || vendor?.icon || '',
      official: officialPrice,
      ours: { input: base.input * rate, output: base.output * rate },
    })
  }

  const picked: PriceRow[] = []
  // 每个系列只取一个：官方价最高的（旗舰）
  for (const prefix of FEATURED_PREFIXES) {
    const family = candidates.filter((row) => row.id.toLowerCase().startsWith(prefix))
    const flagship = family.sort((a, b) => blendedPrice(b.official) - blendedPrice(a.official))[0]
    if (flagship) picked.push(flagship)
  }
  for (const row of candidates) {
    if (picked.length >= MAX_ROWS) break
    if (!picked.includes(row)) picked.push(row)
  }
  return picked.slice(0, MAX_ROWS)
}

/** 本站价相对官方价的比例（综合单价）：0.5 就是 5 折；没有可比数据返回 undefined */
export function priceRatio(row: PriceRow): number | undefined {
  const official = blendedPrice(row.official)
  return official > 0 ? blendedPrice(row.ours) / official : undefined
}

/** 折扣文案：中文「5 折」「0.8 折」，英文「50% off」；与官方同价或更贵不写折扣 */
export function discountLabel(ratio: number | undefined, cny: boolean): string | undefined {
  if (ratio === undefined || ratio >= 0.995) return undefined
  if (cny) {
    const fold = Math.max(Math.round(ratio * 100) / 10, 0.1)
    return `${Number.isInteger(fold) ? fold : fold.toFixed(1)} 折`
  }
  return `${Math.max(Math.round((1 - ratio) * 100), 1)}% off`
}

export function useLivePriceRows() {
  const pricing = usePricing()
  const official = useOfficialPricing(true)
  const format = useQuotaFormat()
  const cny = format.unit === 'CNY'

  const rows = useMemo(() => {
    if (!pricing.data || !official.data) return []
    return buildPriceRows({ pricing: pricing.data, official: official.data, rate: format.rate, cny })
  }, [pricing.data, official.data, format.rate, cny])

  return {
    rows,
    cny,
    isLoading: pricing.isPending || official.isPending,
    isError: pricing.isError || official.isError,
  }
}
