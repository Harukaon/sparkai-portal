import { describe, expect, it } from 'vitest'

import type { OfficialPricing } from '@/features/models/official-pricing'
import type { PricingModel } from '@/features/models/pricing'

import { buildPriceRows, discountLabel, officialInDisplay, priceRatio } from './live-prices'

const model = (name: string, ratio: number, completion: number, groups: string[], vendor_id = 1): PricingModel => ({
  model_name: name,
  vendor_id,
  quota_type: 0,
  model_ratio: ratio,
  model_price: 0,
  completion_ratio: completion,
  enable_groups: groups,
}) as PricingModel

const official: OfficialPricing = {
  updatedAt: '2026-10-01',
  unit: 'USD / 1M tokens',
  models: [
    { id: 'deepseek-flash', name: 'DeepSeek V4.1 Flash', vendor: 'DeepSeek', prices: { modelsDev: { input: 0.15, output: 0.6 } } },
    { id: 'claude-opus-5-5', name: 'Claude Opus 5.5', vendor: 'Anthropic', prices: { modelsDev: { input: 4, output: 20 } } },
  ],
  overrides: { 'deepseek-v4.1-flash': { inputCny: 1, outputCny: 4 } },
}

describe('officialInDisplay', () => {
  it('中文优先用人民币官方价，没有就按汇率折算美元价', () => {
    expect(officialInDisplay({ input: 0.15, output: 0.6, inputCny: 1, outputCny: 4 }, 7, true)).toEqual({ input: 1, output: 4 })
    expect(officialInDisplay({ input: 4, output: 20 }, 7, true)).toEqual({ input: 28, output: 140 })
  })

  it('英文优先用美元官方价', () => {
    expect(officialInDisplay({ input: 0.15, output: 0.6, inputCny: 1, outputCny: 4 }, 1, false)).toEqual({ input: 0.15, output: 0.6 })
  })
})

describe('buildPriceRows', () => {
  const pricing = {
    vendors: [{ id: 1, name: 'X', icon: 'X' }],
    group_ratio: { 国模特价: 0.5, claude特价: 0.08, 顶流模型: 0.8 },
    data: [
      // 输入 $1/M ÷ 7 → 倍率 1/14；输出 ¥4 → 输出倍率 4
      model('deepseek-v4.1-flash', 1 / 14, 4, ['国模特价']),
      model('claude-opus-5-5', 2, 5, ['claude特价', '顶流模型']),
      model('no-official-price', 1, 1, ['国模特价']),
      model('no-group', 1, 1, ['不存在的分组']),
    ],
  }

  it('本站价 = 模型价 × 最低分组倍率，官方价取官方表，查不到官方价或分组的不展示', () => {
    const rows = buildPriceRows({ pricing, official, rate: 7, cny: true })
    expect(rows.map((row) => row.id)).toEqual(['deepseek-v4.1-flash', 'claude-opus-5-5'])

    const deepseek = rows[0]!
    const claude = rows[1]!
    expect(deepseek.official).toEqual({ input: 1, output: 4 })
    expect(deepseek.ours.input).toBeCloseTo(0.5, 6)
    expect(deepseek.ours.output).toBeCloseTo(2, 6)
    expect(deepseek.name).toBe('DeepSeek V4.1 Flash')

    // $4 × 0.08 × 7 = ¥2.24，取 claude特价（0.08）而不是顶流模型（0.8）
    expect(claude.official).toEqual({ input: 28, output: 140 })
    expect(claude.ours.input).toBeCloseTo(2.24, 6)
  })

  it('折扣按综合单价算：5 折、0.8 折、同价不写折扣', () => {
    const rows = buildPriceRows({ pricing, official, rate: 7, cny: true })
    const deepseek = rows[0]!
    const claude = rows[1]!
    expect(discountLabel(priceRatio(deepseek), true)).toBe('5 折')
    expect(discountLabel(priceRatio(claude), true)).toBe('0.8 折')
    expect(discountLabel(1, true)).toBeUndefined()
    expect(discountLabel(0.5, false)).toBe('50% off')
  })
})
