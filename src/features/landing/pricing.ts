import type { PriceRow, UnitPrice } from '@/features/landing/types'

/**
 * 综合单价里输入占的比例。
 * 真实对话中输入的 token 通常远多于输出（上下文、历史消息都要算），
 * 这里按 3:1 折算，与价格表的口径说明保持一致。
 */
const INPUT_SHARE = 0.75

/** 把输入/输出两档价格折算成一个便于横向比较的综合单价（美元 / 百万 token） */
export function blendedPrice(price: UnitPrice): number {
  return price.input * INPUT_SHARE + price.output * (1 - INPUT_SHARE)
}

export interface CostComparison {
  /** 官方直连的月花费（美元） */
  official: number
  /** 走本站的月花费（美元） */
  ours: number
  /** 省下的金额（美元） */
  saved: number
  /** 节省比例 0~1 */
  savedRatio: number
}

/**
 * 按每月用量估算花费对比。
 * 单价取给定模型的平均值 —— 用户的实际模型组合未知，用平均口径给个数量级。
 */
export function compareMonthlyCost(rows: PriceRow[], monthlyVolumeM: number): CostComparison {
  if (rows.length === 0) {
    return { official: 0, ours: 0, saved: 0, savedRatio: 0 }
  }

  const count = rows.length
  const officialUnit = rows.reduce((sum, row) => sum + blendedPrice(row.official), 0) / count
  const ourUnit = rows.reduce((sum, row) => sum + blendedPrice(row.ours), 0) / count

  const official = officialUnit * monthlyVolumeM
  const ours = ourUnit * monthlyVolumeM

  return {
    official,
    ours,
    saved: official - ours,
    savedRatio: official === 0 ? 0 : (official - ours) / official,
  }
}
