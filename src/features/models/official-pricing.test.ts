import { describe, expect, it } from 'vitest'

import { officialPriceFor } from './official-pricing'

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
})
