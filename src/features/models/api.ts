import { useQuery } from '@tanstack/react-query'

import type { PricingResponse } from '@/features/models/pricing'
import { ApiError, http } from '@/shared/api/client'

/** /api/pricing 的厂商/分组在 data 旁边，不能用通用 apiGet 直接拆包。 */
export async function fetchPricing(): Promise<PricingResponse> {
  const response = await http.get<PricingResponse>('/api/pricing')
  const body = response.data
  if (body?.success !== true || !Array.isArray(body.data)) {
    throw new ApiError(body?.message || '暂时获取不到模型价格', response.status)
  }
  return body
}

export function usePricing() {
  return useQuery({ queryKey: ['pricing'], queryFn: fetchPricing, staleTime: 60_000 })
}
