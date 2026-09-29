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

  describe('动态计费（表达式）', () => {
    // 线上 /api/pricing 返回的 glm-5.3-flash 原文
    const glm: PricingModel = {
      ...base, model_name: 'glm-5.3-flash', model_ratio: 37.5, completion_ratio: 1, billing_mode: 'tiered_expr',
      billing_expr: 'tier("standard", p * 0.15 + cr * 0.03 + cc * 0 + c * 0.5)',
    }

    it('单档表达式显示真实价格，不再只写「动态计费」；残留的 model_ratio 兜底值不参与', () => {
      expect(modelPrice(glm, 1)).toEqual({ kind: 'tokens', input: 0.15, output: 0.5 })
    })

    it('表达式结果同样再乘分组倍率（与后端结算一致）', () => {
      const result = modelPrice(glm, 2)
      expect(result.kind).toBe('tokens')
      if (result.kind === 'tokens') {
        expect(result.input).toBeCloseTo(0.3)
        expect(result.output).toBeCloseTo(1)
      }
    })

    it('自动分组无法预知倍率，表达式模型同样不冒充固定价格', () => {
      expect(modelPrice(glm)).toEqual({ kind: 'unknown' })
    })

    it('按输入长度分档：每一档都乘分组倍率', () => {
      const tiered: PricingModel = {
        ...base, billing_mode: 'tiered_expr',
        billing_expr: 'len <= 272000 ? tier("standard", p * 10 + c * 50) : tier("long_context", p * 20 + c * 75)',
      }
      expect(modelPrice(tiered, 0.5)).toEqual({
        kind: 'tiers',
        tiers: [
          { name: 'standard', upToLen: 272000, input: 5, output: 25 },
          { name: 'long_context', upToLen: undefined, input: 10, output: 37.5 },
        ],
      })
    })

    it('表达式读不懂或缺失时保持「动态计费」，不猜价格', () => {
      expect(modelPrice({ ...base, billing_mode: 'tiered_expr', billing_expr: 'tier("s", p * 5 + img * 8 + c * 30)' }, 1)).toEqual({ kind: 'dynamic' })
      expect(modelPrice({ ...base, billing_mode: 'tiered_expr', billing_expr: 'tier("b", u("clips") * 0.1)' }, 1)).toEqual({ kind: 'dynamic' })
      expect(modelPrice({ ...base, billing_expr: 'garbage' }, 1)).toEqual({ kind: 'dynamic' })
    })

    it('倍率计费的模型不受影响', () => {
      expect(modelPrice({ ...base, billing_mode: 'ratio' }, 1)).toMatchObject({ kind: 'tokens', input: 3, output: 12 })
    })
  })

  it('只显示当前分组可用的模型，all 对全部分组开放', () => {
    expect(matchesGroup(base, 'vip')).toBe(false)
    expect(matchesGroup({ ...base, enable_groups: ['all'] }, 'vip')).toBe(true)
  })
})
