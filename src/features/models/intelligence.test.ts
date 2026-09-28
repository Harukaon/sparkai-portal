import { describe, expect, it } from 'vitest'

import { intelligenceOf, parseIntelligence, sortByIntelligence } from './intelligence'

describe('智力分', () => {
  it('只收 0–100 的数字，名称不区分大小写', () => {
    const table = parseIntelligence({ scores: { 'DeepSeek-V3': 88.4, bad: 120, text: '90', neg: -1 } })
    expect(intelligenceOf(table, 'deepseek-v3')).toBe(88)
    expect(intelligenceOf(table, 'bad')).toBeUndefined()
    expect(intelligenceOf(table, 'text')).toBeUndefined()
    expect(table.size).toBe(1)
  })

  it('格式不对时返回空表，不影响页面', () => {
    expect(parseIntelligence(null).size).toBe(0)
    expect(parseIntelligence({ scores: 'x' }).size).toBe(0)
  })

  it('按智力从高到低，没打分的排最后', () => {
    const table = parseIntelligence({ scores: { a: 60, b: 90 } })
    const sorted = sortByIntelligence([{ model_name: 'c' }, { model_name: 'a' }, { model_name: 'b' }], table)
    expect(sorted.map((m) => m.model_name)).toEqual(['b', 'a', 'c'])
  })
})
