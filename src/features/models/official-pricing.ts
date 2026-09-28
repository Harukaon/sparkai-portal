import { useQuery } from '@tanstack/react-query'

export interface OfficialModelPrice {
  input?: number
  output?: number
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

async function fetchOfficialPricing(): Promise<OfficialPricingFile> {
  const response = await fetch('/official-pricing.json', { cache: 'no-cache' })
  if (!response.ok) throw new Error(`Official pricing unavailable: ${response.status}`)
  return response.json() as Promise<OfficialPricingFile>
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
