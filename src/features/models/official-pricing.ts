import { useQuery } from '@tanstack/react-query'

export interface OfficialModelPrice {
  input?: number
  output?: number
  inputCny?: number
  outputCny?: number
}

export interface OfficialPriceEntry {
  id: string
  name: string
  vendor: string
  prices: { modelsDev?: OfficialModelPrice }
}

interface OfficialPricingFile {
  updatedAt: string
  unit: string
  models: OfficialPriceEntry[]
}

/** 手工维护表：键是本站模型调用名称；美元和人民币字段分别覆盖对应币种 */
interface OfficialPricingOverrides {
  models: Record<string, OfficialModelPrice>
}

export interface OfficialPricing extends OfficialPricingFile {
  overrides: Record<string, OfficialModelPrice>
}

async function fetchOfficialPricing(): Promise<OfficialPricing> {
  const [auto, manual] = await Promise.all([
    fetch('/official-pricing.json', { cache: 'no-cache' }),
    // 手工表取不到时不影响自动参考价
    fetch('/official-pricing-overrides.json', { cache: 'no-cache' }).catch(() => undefined),
  ])
  if (!auto.ok) throw new Error(`Official pricing unavailable: ${auto.status}`)
  const file = await auto.json() as OfficialPricingFile
  const overrides = manual?.ok ? ((await manual.json()) as OfficialPricingOverrides).models ?? {} : {}
  return { ...file, overrides }
}

/** 取某个模型的官方价：手工表按币种覆盖自动抓取的参考价 */
export function officialPriceOf(modelName: string, pricing?: OfficialPricing): OfficialModelPrice | undefined {
  if (!pricing) return undefined
  const automatic = officialPriceFor(modelName, pricing.models)?.prices.modelsDev
  const manual = pricing.overrides[modelName]
  if (!automatic && !manual) return undefined
  return { ...automatic, ...manual }
}

export function useOfficialPricing(enabled: boolean) {
  return useQuery({
    queryKey: ['official-pricing', 'models-dev'],
    queryFn: fetchOfficialPricing,
    enabled,
    staleTime: 60 * 60 * 1000,
  })
}

function normalizeModelId(value: string): string {
  return value.trim().toLowerCase().replace(/^.*\//, '').replace(/[^a-z0-9]/g, '')
}

/** 只做名称完全匹配，避免把相近型号的官方价误显示为同一模型。 */
export function officialPriceFor(modelName: string, entries: OfficialPriceEntry[]): OfficialPriceEntry | undefined {
  const id = normalizeModelId(modelName)
  return entries.find((entry) => normalizeModelId(entry.id) === id) ??
    entries.find((entry) => normalizeModelId(entry.name) === id)
}
