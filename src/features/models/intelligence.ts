import { useQuery } from '@tanstack/react-query'

/**
 * 模型「智力」分：本站自己维护的指标，数据在 public/model-intelligence.json。
 * 放在 public 下是为了改分不用重新打包，替换这个文件、用户刷新页面即生效。
 */
export type IntelligenceTable = Map<string, number>

const SOURCE = '/model-intelligence.json'

/** 只接受 0–100 的数字；键统一小写，查的时候不区分大小写。写错的条目直接忽略。 */
export function parseIntelligence(raw: unknown): IntelligenceTable {
  const table: IntelligenceTable = new Map()
  const scores = (raw as { scores?: unknown } | null)?.scores
  if (!scores || typeof scores !== 'object') return table
  for (const [name, value] of Object.entries(scores as Record<string, unknown>)) {
    const score = typeof value === 'number' ? value : Number.NaN
    if (name.trim() && Number.isFinite(score) && score >= 0 && score <= 100) {
      table.set(name.trim().toLowerCase(), Math.round(score))
    }
  }
  return table
}

export function intelligenceOf(table: IntelligenceTable | undefined, modelName: string): number | undefined {
  return table?.get(modelName.trim().toLowerCase())
}

/** 智力从高到低；没打分的排最后，同分按名称排。 */
export function sortByIntelligence<T extends { model_name: string }>(models: T[], table: IntelligenceTable | undefined): T[] {
  return [...models].sort((a, b) => {
    const sa = intelligenceOf(table, a.model_name)
    const sb = intelligenceOf(table, b.model_name)
    if (sa === undefined && sb === undefined) return a.model_name.localeCompare(b.model_name)
    if (sa === undefined) return 1
    if (sb === undefined) return -1
    return sb - sa || a.model_name.localeCompare(b.model_name)
  })
}

async function fetchIntelligence(): Promise<IntelligenceTable> {
  const response = await fetch(SOURCE, { cache: 'no-cache' })
  if (!response.ok) return new Map()
  return parseIntelligence(await response.json())
}

/** 取不到数据表时不报错，模型广场照常显示，只是智力列全是「—」。 */
export function useIntelligence() {
  return useQuery({ queryKey: ['model-intelligence'], queryFn: fetchIntelligence, staleTime: 5 * 60_000, retry: false })
}
