import { describe, expect, it } from 'vitest'

import type { TopupInfo } from './api'
import { amountOptions, creemProducts, discountFor, onlineTopupAvailable, paymentMethods } from './topup'

const base: TopupInfo = {
  enable_online_topup: false,
  enable_stripe_topup: false,
  pay_methods: [],
  min_topup: 1,
  stripe_min_topup: 5,
  amount_options: [10, 20, 50],
  discount: {},
  creem_products: '[]',
}

describe('充值配置解析', () => {
  it('站点未开通时没有任何在线支付方式', () => {
    expect(paymentMethods(base)).toEqual([])
    expect(onlineTopupAvailable(base)).toBe(false)
  })

  it('易支付受总开关控制，Stripe 看自己的开关并用自己的最低额度', () => {
    const info: TopupInfo = {
      ...base,
      enable_stripe_topup: true,
      pay_methods: [
        { name: '支付宝', type: 'alipay', min_topup: '2' },
        { name: 'Stripe', type: 'stripe' },
      ],
    }
    expect(paymentMethods(info)).toEqual([{ type: 'stripe', name: 'Stripe', min: 5 }])
    expect(paymentMethods({ ...info, enable_online_topup: true })[0]).toEqual({ type: 'alipay', name: '支付宝', min: 2 })
  })

  it('金额选项和折扣兼容 JSON 字符串，异常值被忽略', () => {
    const info = { ...base, amount_options: '[10, "x", -1, 100]', discount: '{"100": 0.9, "10": 2}' }
    expect(amountOptions(info)).toEqual([10, 100])
    expect(discountFor(info, 100)).toBe(0.9)
    expect(discountFor(info, 10)).toBe(1)
    expect(discountFor({ ...base, discount: 'not json' }, 10)).toBe(1)
  })

  it('Creem 商品只在开关打开时展示', () => {
    const products = '[{"name":"入门包","productId":"p1","price":9.9,"quota":500000,"currency":"USD"}]'
    expect(creemProducts({ ...base, creem_products: products })).toEqual([])
    expect(creemProducts({ ...base, enable_creem_topup: true, creem_products: products })).toHaveLength(1)
  })
})
