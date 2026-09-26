import { describe, expect, it } from 'vitest'

import { estimateCost } from './billing'

describe('estimateCost', () => {
  it('按每百万 token 分别计算输入与输出费用', () => {
    const result = estimateCost({
      model: 'demo',
      inputTokens: 12_000,
      outputTokens: 800,
      inputPrice: 1.25,
      outputPrice: 10,
    })

    expect(result.inputCost).toBeCloseTo(0.015, 6)
    expect(result.outputCost).toBeCloseTo(0.008, 6)
    expect(result.total).toBeCloseTo(0.023, 6)
  })

  it('零用量时花费为零', () => {
    const result = estimateCost({
      model: 'demo',
      inputTokens: 0,
      outputTokens: 0,
      inputPrice: 3,
      outputPrice: 15,
    })

    expect(result.total).toBe(0)
  })

  it('恰好一百万 token 时等于单价', () => {
    const result = estimateCost({
      model: 'demo',
      inputTokens: 1_000_000,
      outputTokens: 0,
      inputPrice: 2.5,
      outputPrice: 9,
    })

    expect(result.inputCost).toBe(2.5)
  })
})
