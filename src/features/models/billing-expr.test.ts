import { describe, expect, it } from 'vitest'

import { parseBillingExpr } from './billing-expr'

// 下面的表达式都来自 new-api 后端的真实配置或内置表（glm-5.3-flash 是线上 /api/pricing 返回的原文）
const GLM_FLASH = 'tier("standard", p * 0.15 + cr * 0.03 + cc * 0 + c * 0.5)'
const GPT_TIERED =
  'len <= 272000 ? tier("standard", p * 10 + c * 50 + cr * 1 + cc * 12.5) : tier("long_context", p * 20 + c * 75 + cr * 2 + cc * 25)'

describe('parseBillingExpr：认得出的写法', () => {
  it('单档：解析出输入、输出价', () => {
    expect(parseBillingExpr(GLM_FLASH)).toEqual([{ name: 'standard', input: 0.15, output: 0.5 }])
  })

  it('缓存项（cr / cc）能被接受，但结果里没有缓存价：模型列表不展示缓存价格', () => {
    const [withCache] = parseBillingExpr(GLM_FLASH) ?? []
    const [withoutCache] = parseBillingExpr('tier("standard", p * 0.15 + c * 0.5)') ?? []
    expect(withCache).toEqual(withoutCache)
    expect(withCache).not.toHaveProperty('cacheRead')
  })

  it('按输入长度分档：前面的档带上限，最后一档没有上限', () => {
    expect(parseBillingExpr(GPT_TIERED)).toEqual([
      { name: 'standard', upToLen: 272000, input: 10, output: 50 },
      { name: 'long_context', input: 20, output: 75 },
    ])
  })

  it('三档也能解析，且上限必须严格递增', () => {
    const tiers = parseBillingExpr(
      'len <= 128000 ? tier("s", p * 1 + c * 2) : len <= 512000 ? tier("m", p * 2 + c * 4) : tier("l", p * 4 + c * 8)',
    )
    expect(tiers?.map((tier) => [tier.name, tier.upToLen])).toEqual([['s', 128000], ['m', 512000], ['l', undefined]])
    expect(parseBillingExpr('len <= 200 ? tier("a", p * 1 + c * 1) : len <= 100 ? tier("b", p * 1 + c * 1) : tier("c", p * 1 + c * 1)')).toBeNull()
    expect(parseBillingExpr('len <= 100 ? tier("a", p * 1 + c * 1) : len <= 100 ? tier("b", p * 1 + c * 1) : tier("c", p * 1 + c * 1)')).toBeNull()
  })

  it('len < N 按整数 token 数折成 len <= N-1', () => {
    expect(parseBillingExpr('len < 200001 ? tier("a", p * 1 + c * 2) : tier("b", p * 2 + c * 4)')?.[0]?.upToLen).toBe(200000)
  })

  it('允许换行、多余空白与 v1: 版本前缀；其它版本不认', () => {
    expect(parseBillingExpr(`v1:\n  tier( "standard" ,\n  p*0.15 +  c *0.5 )  `)?.[0]).toMatchObject({ input: 0.15, output: 0.5 })
    expect(parseBillingExpr('v2:tier("standard", p * 1 + c * 2)')).toBeNull()
  })

  it('同一个变量出现多次时相加（与求值结果一致）', () => {
    expect(parseBillingExpr('tier("x", p * 1 + p * 2 + c * 4)')?.[0]).toMatchObject({ input: 3, output: 4 })
  })

  it('支持小数与科学计数法', () => {
    expect(parseBillingExpr('tier("x", p * 0.075 + c * 1e-1)')?.[0]).toMatchObject({ input: 0.075, output: 0.1 })
  })
})

describe('parseBillingExpr：看不懂就放弃（页面继续显示「动态计费」）', () => {
  it.each([
    ['图片分项计价', 'tier("standard", p * 5 + cr * 1.25 + img * 8 + img_cr * 2 + c * 30)'],
    ['任务用量', 'tier("base", u("clips") * 0.1)'],
    ['任务条件表达式', 'u("mode") == "pro" ? tier("pro", u("seconds") * 0.8) : tier("std", u("seconds") * 0.4)'],
    ['固定按次价', 'true ? tier("normal", u("seconds") * 0.4) : tier("fixed", fixed(0.01))'],
    ['只有输入价', 'tier("custom", p * 7)'],
    ['只有输出价', 'tier("custom", c * 7)'],
    ['括号运算', 'tier("x", (p) * 2 + c * 3)'],
    ['系数在前', 'tier("x", 2 * p + 3 * c)'],
    ['负系数', 'tier("x", p * -2 + c * 3)'],
    ['除法', 'tier("x", p / 2 + c * 3)'],
    ['多余的尾巴', 'tier("x", p * 2 + c * 8) + 1'],
    ['len > 比较', 'len > 1000 ? tier("a", p * 1 + c * 1) : tier("b", p * 1 + c * 1)'],
    ['条件分支里混入不认识的写法', 'len <= 1000 ? tier("a", p * 1 + c * 1) : fixed(1)'],
    ['缺右括号', 'tier("x", p * 2 + c * 8'],
    ['不是 tier', 'p * 2 + c * 8'],
    ['空串', ''],
    ['只有空白', '   \n  '],
    ['乱码', '@@@'],
  ])('%s → null', (_label, expression) => {
    expect(parseBillingExpr(expression)).toBeNull()
  })
})
