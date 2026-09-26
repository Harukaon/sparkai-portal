import type { BillingExample } from '@/features/landing/types'

export interface CostBreakdown {
  inputCost: number
  outputCost: number
  total: number
}

/**
 * 按「每百万 token 单价」计算一次请求的花费。
 * 纯函数，方便单测；页面只负责展示，金额口径都在这里。
 */
export function estimateCost(example: BillingExample): CostBreakdown {
  const inputCost = (example.inputTokens / 1_000_000) * example.inputPrice
  const outputCost = (example.outputTokens / 1_000_000) * example.outputPrice

  return {
    inputCost,
    outputCost,
    total: inputCost + outputCost,
  }
}
