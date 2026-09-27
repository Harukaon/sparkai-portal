import { describe, expect, it } from 'vitest'

import { matchesGroup, modelPrice } from './pricing'
import type { PricingModel } from './pricing'

const base: PricingModel = {
  model_name: 'example-model', quota_type: 0, model_ratio: 1.5,
  completion_ratio: 4, model_price: 0, enable_groups: ['default'],
}

describe('模型定价', () => {
  it('倍率计费显示输入与输出的每百万 token 美元价', () => {
    const result = modelPrice(base, 0.8)
    expect(result.kind).toBe('tokens')
    if (result.kind === 'tokens') {
      expect(result.input).toBeCloseTo(2.4)
      expect(result.output).toBeCloseTo(9.6)
    }
  })

  it('按次计费显示美元每次，而不是每百万 token', () => {
    expect(modelPrice({ ...base, quota_type: 1, model_price: 0.3 }, 2)).toEqual({ kind: 'request', each: 0.6 })
  })

  it('自动分组或动态计费不能冒充固定单价', () => {
    expect(modelPrice(base)).toEqual({ kind: 'unknown' })
    expect(modelPrice({ ...base, billing_mode: 'tiered_expr' }, 1)).toEqual({ kind: 'dynamic' })
  })

  it('只显示当前分组可用的模型，all 对全部分组开放', () => {
    expect(matchesGroup(base, 'vip')).toBe(false)
    expect(matchesGroup({ ...base, enable_groups: ['all'] }, 'vip')).toBe(true)
  })
})
