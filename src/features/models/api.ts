import { useQuery } from '@tanstack/react-query'

import type { PricingResponse } from '@/features/models/pricing'
import { ApiError, http } from '@/shared/api/client'

/** 仅开发环境用于页面排版检查；不会改变服务端配置或生产构建。 */
function applyEndpointPreview(body: PricingResponse): PricingResponse {
  if (
    !import.meta.env.DEV ||
    typeof window === 'undefined' ||
    new URLSearchParams(window.location.search).get('previewEndpoints') !== 'anthropic'
  ) return body

  return {
    ...body,
    data: body.data.map((model) => model.model_name.startsWith('deepseek/')
      ? { ...model, supported_endpoint_types: [...new Set([...(model.supported_endpoint_types ?? []), 'anthropic'])] }
      : model),
  }
}

/** /api/pricing 的厂商/分组在 data 旁边，不能用通用 apiGet 直接拆包。 */
export async function fetchPricing(): Promise<PricingResponse> {
  const response = await http.get<PricingResponse>('/api/pricing')
  const body = response.data
  if (body?.success !== true || !Array.isArray(body.data)) {
    throw new ApiError(body?.message || '暂时获取不到模型价格', response.status)
  }
  return applyEndpointPreview(body)
}

export function usePricing() {
  return useQuery({ queryKey: ['pricing'], queryFn: fetchPricing, staleTime: 60_000 })
}
