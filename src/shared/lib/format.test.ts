import { describe, expect, it } from 'vitest'

import { cn, formatCompact, formatInt, formatMoney, formatPercent } from './format'

describe('cn', () => {
  it('拼接有效类名并过滤空值', () => {
    expect(cn('a', undefined, 'b', false, null, '')).toBe('a b')
  })
})

describe('formatInt', () => {
  it('加千分位', () => {
    expect(formatInt(1234567)).toBe('1,234,567')
  })

  it('四舍五入到整数', () => {
    expect(formatInt(12.6)).toBe('13')
  })
})

describe('formatCompact', () => {
  it('过万用「万」计数', () => {
    expect(formatCompact(12345)).toBe('1.2万')
  })

  it('小数保留一位', () => {
    expect(formatCompact(1500)).toBe('1500')
  })
})

describe('formatMoney', () => {
  it('常规金额保留两位并加千分位', () => {
    expect(formatMoney(12345.678)).toBe('¥12,345.68')
  })

  it('小额保留四位，不显示成 0', () => {
    expect(formatMoney(0.01234)).toBe('¥0.0123')
  })

  it('零保留两位', () => {
    expect(formatMoney(0)).toBe('¥0.00')
  })

  it('可以指定小数位，用于单价展示', () => {
    expect(formatMoney(0.1, '$', 2)).toBe('$0.10')
    expect(formatMoney(1.235, '$', 2)).toBe('$1.24')
  })

  it('负数也带千分位', () => {
    expect(formatMoney(-1234.5)).toBe('¥-1,234.50')
  })
})

describe('formatPercent', () => {
  it('小数转百分比', () => {
    expect(formatPercent(0.8123)).toBe('81.2%')
  })
})
