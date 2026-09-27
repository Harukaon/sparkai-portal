import { describe, expect, it } from 'vitest'

import { amountToQuota, formatQuota, quotaFormatFrom } from './quota'
import { containsPattern, dailyUsage, rangeFor } from './usage'

describe('额度显示', () => {
  it('默认按美元显示，500,000 额度 = $1', () => {
    const format = quotaFormatFrom({ quota_per_unit: 500_000, quota_display_type: 'USD' })
    expect(formatQuota(1_250_000, format)).toBe('$2.50')
  })

  it('人民币按后台汇率换算，小额请求保留足够小数', () => {
    const format = quotaFormatFrom({ quota_per_unit: 500_000, quota_display_type: 'CNY', usd_exchange_rate: 7.3 })
    expect(formatQuota(500_000, format)).toBe('¥7.30')
    expect(formatQuota(100, format)).toBe('¥0.00146')
  })

  it('额度模式直接显示整数；金额与额度可互相换算', () => {
    const tokens = quotaFormatFrom({ quota_display_type: 'TOKENS' })
    expect(formatQuota(1234567, tokens)).toBe('1,234,567')
    const usd = quotaFormatFrom({ quota_per_unit: 500_000 })
    expect(amountToQuota(10, usd)).toBe(5_000_000)
  })
})

describe('用量时间范围', () => {
  const now = new Date(2026, 8, 27, 15, 30, 0)

  it('近 7 天从 6 天前的零点开始，包含今天', () => {
    const range = rangeFor('7d', now)
    expect(new Date((range.start_timestamp ?? 0) * 1000)).toEqual(new Date(2026, 8, 21, 0, 0, 0))
    expect(rangeFor('all', now)).toEqual({})
  })

  it('按本地日期合并小时数据，空白日子补 0', () => {
    const at = (day: number, hour: number) => Math.floor(new Date(2026, 8, day, hour).getTime() / 1000)
    const days = dailyUsage([
      { model_name: 'a', created_at: at(27, 1), count: 2, quota: 100, token_used: 50 },
      { model_name: 'b', created_at: at(27, 9), count: 1, quota: 40, token_used: 10 },
      { model_name: 'a', created_at: at(22, 23), count: 3, quota: 7, token_used: 5 },
      { model_name: 'a', created_at: at(1, 10), count: 9, quota: 9, token_used: 9 },
    ], 7, now)
    expect(days).toHaveLength(7)
    expect(days[6]).toMatchObject({ label: '9/27', quota: 140, count: 3, tokens: 60 })
    expect(days[1]).toMatchObject({ label: '9/22', quota: 7 })
    expect(days[0]).toMatchObject({ label: '9/21', quota: 0 })
  })
})

describe('模型名搜索', () => {
  it('两个字符以上按包含搜索，单字符精确匹配，自带通配符原样使用', () => {
    expect(containsPattern(' gpt ')).toBe('%gpt%')
    expect(containsPattern('g')).toBe('g')
    expect(containsPattern('gpt-4%')).toBe('gpt-4%')
    expect(containsPattern('')).toBe('')
  })
})
