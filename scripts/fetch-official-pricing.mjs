#!/usr/bin/env node
/**
 * 抓取 models.dev 中全部有官方价格的模型，生成 public/official-pricing.json。
 *
 * 数据源：models.dev（模型清单以它为准）、LiteLLM、OpenRouter，三家价格并排记录。
 * 单位：美元 / 百万 token。用海外站（美元）口径。
 *
 * 用法：node scripts/fetch-official-pricing.mjs
 */
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const OUT = fileURLToPath(new URL('../public/official-pricing.json', import.meta.url))

const SOURCES = {
  modelsDev: 'https://models.dev/api.json',
  litellm: 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json',
  openrouter: 'https://openrouter.ai/api/v1/models',
}

// models.dev 也收录模型聚合商、云市场和转售渠道；此处只保留模型厂商自己的官方目录。
const MODEL_MAKERS = new Set([
  'anthropic', 'openai', 'google', 'xai', 'deepseek', 'cohere', 'mistral', 'ai21',
  'meta', 'perplexity', 'alibaba', 'moonshotai', 'minimax', 'zai', 'stepfun',
  'xiaomi', 'volcengine', 'sarvam', 'upstage', 'poolside',
  'thinkingmachines', 'sakana', 'arcee', 'inception', 'longcat',
])

// 对常见品牌模型 ID 固定归属，避免云平台目录里的转售模型覆盖原厂价格。
const MODEL_OWNER_PREFIXES = [
  [/^claude-/, 'anthropic'], [/^(gpt-|o[134]-)/, 'openai'], [/^(gemini-|gemma-)/, 'google'],
  [/^deepseek-/, 'deepseek'], [/^kimi-/, 'moonshotai'], [/^glm-/, 'zai'],
  [/^qwen/, 'alibaba'], [/^grok-/, 'xai'], [/^llama-/, 'meta'],
  [/^mistral-/, 'mistral'], [/^command(-|$)/, 'cohere'], [/^jamba-/, 'ai21'],
  [/^minimax-/, 'minimax'],
]

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
const orModels = orRaw.data.map((model) => [model.id.toLowerCase(), model])
const orById = new Map(orModels)

function findOpenRouterModel(providerId, id) {
  const key = id.toLowerCase()
  const aliases = {
    google: ['google'],
    xai: ['x-ai'],
    zai: ['z-ai'],
  }
  for (const provider of [providerId, ...(aliases[providerId] ?? [])]) {
    const exact = orById.get(`${provider}/${key}`)
    if (exact) return exact
  }

  // 两边厂商命名不一致时，只在模型 slug 全局唯一的情况下回退，避免错配同名模型。
  const matches = orModels.filter(([modelId]) => modelId.endsWith(`/${key}`))
  return matches.length === 1 ? matches[0][1] : undefined
}

const models = []
for (const [providerId, provider] of Object.entries(md)) {
  if (!MODEL_MAKERS.has(providerId)) continue
  for (const [id, model] of Object.entries(provider.models ?? {})) {
    if (!model.cost) continue
    const owner = MODEL_OWNER_PREFIXES.find(([pattern]) => pattern.test(id))?.[1]
    if (owner && providerId !== owner) continue

    const llHit = ll[`${providerId}/${id}`] ?? ll[id]
    const orHit = findOpenRouterModel(providerId, id)

    models.push({
      id,
      vendor: provider.name ?? providerId,
      name: model.name ?? id,
      prices: {
        modelsDev: clean({
          input: round(model.cost.input),
          output: round(model.cost.output),
          cacheRead: round(model.cost.cache_read),
          cacheWrite: round(model.cost.cache_write),
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
console.log(`写入 ${models.length} 个模型，覆盖 ${new Set(models.map((model) => model.vendor)).size} 家厂商 -> ${OUT}`)
