#!/usr/bin/env node
/**
 * 抓取主流模型的官方 API 价格，生成 public/official-pricing.json。
 *
 * 数据源：models.dev（模型清单以它为准）、LiteLLM、OpenRouter，三家价格并排记录。
 * 单位：美元 / 百万 token。用海外站（美元）口径。
 *
 * 用法：node scripts/fetch-official-pricing.mjs
 */
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const OUT = fileURLToPath(new URL('../public/official-pricing.json', import.meta.url))

// 厂商：models.dev 的 key、LiteLLM 前缀、OpenRouter 前缀
const VENDORS = [
  { vendor: 'DeepSeek', modelsDev: 'deepseek', litellm: ['deepseek'], openrouter: 'deepseek' },
  { vendor: 'Gemini', modelsDev: 'google', litellm: ['gemini'], openrouter: 'google' },
  { vendor: 'MiniMax', modelsDev: 'minimax', litellm: ['minimax'], openrouter: 'minimax' },
  { vendor: 'Kimi', modelsDev: 'moonshotai', litellm: ['moonshot'], openrouter: 'moonshotai' },
  { vendor: 'GLM', modelsDev: 'zai', litellm: ['zai'], openrouter: 'z-ai' },
]

const SOURCES = {
  modelsDev: 'https://models.dev/api.json',
  litellm: 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json',
  openrouter: 'https://openrouter.ai/api/v1/models',
}

const getJson = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  return res.json()
}

/** 每 token 单价 -> 每百万 token，保留 4 位小数 */
const perM = (v) => {
  const n = Number(v)
  if (v == null || v === '' || !Number.isFinite(n) || n < 0) return undefined
  return Math.round(n * 1e6 * 1e4) / 1e4
}
const round = (v) => (typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : undefined)
const clean = (o) => {
  const r = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))
  return Object.keys(r).length ? r : undefined
}

const [md, ll, orRaw] = await Promise.all(Object.values(SOURCES).map(getJson))
const orById = new Map(orRaw.data.map((m) => [m.id.toLowerCase(), m]))

const models = []
for (const v of VENDORS) {
  const list = md[v.modelsDev]?.models ?? {}
  for (const [id, m] of Object.entries(list)) {
    if (!m.cost) continue
    const key = id.toLowerCase()

    const llHit = v.litellm.map((p) => ll[`${p}/${id}`]).find(Boolean) ?? ll[id]
    const orHit = orById.get(`${v.openrouter}/${key}`)

    models.push({
      id,
      vendor: v.vendor,
      name: m.name ?? id,
      prices: {
        modelsDev: clean({
          input: round(m.cost.input),
          output: round(m.cost.output),
          cacheRead: round(m.cost.cache_read),
          cacheWrite: round(m.cost.cache_write),
        }),
        litellm: llHit
          ? clean({
              input: perM(llHit.input_cost_per_token),
              output: perM(llHit.output_cost_per_token),
              cacheRead: perM(llHit.cache_read_input_token_cost),
              cacheWrite: perM(llHit.cache_creation_input_token_cost),
            })
          : undefined,
        openrouter: orHit
          ? clean({
              input: perM(orHit.pricing.prompt),
              output: perM(orHit.pricing.completion),
              cacheRead: perM(orHit.pricing.input_cache_read),
              cacheWrite: perM(orHit.pricing.input_cache_write),
            })
          : undefined,
      },
    })
  }
}

models.sort((a, b) => a.vendor.localeCompare(b.vendor) || a.id.localeCompare(b.id))

const out = {
  updatedAt: new Date().toISOString(),
  unit: 'USD / 1M tokens',
  sources: SOURCES,
  models,
}
await writeFile(OUT, JSON.stringify(out, null, 2) + '\n')
console.log(`写入 ${models.length} 个模型 -> ${OUT}`)
