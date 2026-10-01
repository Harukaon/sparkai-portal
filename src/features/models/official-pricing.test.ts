import { describe, expect, it } from 'vitest'

import { officialPriceFor, officialPriceOf } from './official-pricing'

const entries = [
  { id: 'deepseek-flash', name: 'DeepSeek V4.1 Flash', vendor: 'DeepSeek', prices: { modelsDev: { input: 0.15, output: 0.6 } } },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', vendor: 'Gemini', prices: { modelsDev: { input: 0.3, output: 2.5 } } },
]

describe('officialPriceFor', () => {
  it('matches exact model ids regardless of case and provider prefix', () => {
    expect(officialPriceFor('DeepSeek/deepseek-flash', entries)?.id).toBe('deepseek-flash')
    expect(officialPriceFor('GEMINI-2.5-FLASH', entries)?.id).toBe('gemini-2.5-flash')
  })

  it('does not match similar but different model names', () => {
    expect(officialPriceFor('gemini-2.5-flash-lite', entries)).toBeUndefined()
  })

  it('matches exact display names', () => {
    expect(officialPriceFor('DeepSeek V4.1 Flash', entries)?.id).toBe('deepseek-flash')
  })

  it('keeps a manual CNY price alongside the automatic USD reference price', () => {
    const price = officialPriceOf('deepseek-v4.1-flash', {
      updatedAt: '2026-10-01',
      unit: 'USD / 1M tokens',
      models: entries,
      overrides: { 'deepseek-v4.1-flash': { inputCny: 1, outputCny: 4 } },
    })
    expect(price).toEqual({ input: 0.15, output: 0.6, inputCny: 1, outputCny: 4 })
  })
})
