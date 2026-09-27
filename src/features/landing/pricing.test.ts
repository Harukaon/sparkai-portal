import { describe, expect, it } from 'vitest'

import { blendedPrice, compareMonthlyCost } from './pricing'
import type { PriceRow } from './types'

describe('blendedPrice', () => {
  it('按 3:1 折算输入与输出', () => {
    // 0.75 × 1 + 0.25 × 10 = 3.25
    expect(blendedPrice({ input: 1, output: 10 })).toBeCloseTo(3.25, 6)
  })

  it('输入输出相同时等于该价格', () => {
    expect(blendedPrice({ input: 2, output: 2 })).toBeCloseTo(2, 6)
  })

  it('零价格折算为零', () => {
    expect(blendedPrice({ input: 0, output: 0 })).toBe(0)
  })
})

describe('compareMonthlyCost', () => {
  const rows: PriceRow[] = [
    {
      id: 'a',
      name: 'A',
      provider: 'P',
      icon: '',
      official: { input: 1, output: 10 }, // 折算 3.25
      ours: { input: 0.4, output: 4 }, // 折算 1.3
    },
    {
      id: 'b',
      name: 'B',
      provider: 'P',
      icon: '',
      official: { input: 3, output: 15 }, // 折算 6
      ours: { input: 1.2, output: 6 }, // 折算 2.4
    },
  ]

  it('按平均单价乘以用量得出总花费', () => {
    const result = compareMonthlyCost(rows, 100)

    // 官方平均 (3.25 + 6) / 2 = 4.625，乘 100M
    expect(result.official).toBeCloseTo(462.5, 6)
    // 本站平均 (1.3 + 2.4) / 2 = 1.85，乘 100M
    expect(result.ours).toBeCloseTo(185, 6)
    expect(result.saved).toBeCloseTo(277.5, 6)
  })

  it('节省比例等于省下金额占官方的比例', () => {
    const result = compareMonthlyCost(rows, 100)

    expect(result.savedRatio).toBeCloseTo(277.5 / 462.5, 6)
  })

  it('零用量时花费与节省都是零', () => {
    const result = compareMonthlyCost(rows, 0)

    expect(result.official).toBe(0)
    expect(result.ours).toBe(0)
    expect(result.saved).toBe(0)
  })

  it('没有模型时返回全零，不应出现除零', () => {
    const result = compareMonthlyCost([], 500)

    expect(result).toEqual({ official: 0, ours: 0, saved: 0, savedRatio: 0 })
  })
})
