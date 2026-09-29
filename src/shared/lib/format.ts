/** 通用格式化工具：只放纯函数，方便单测与复用 */

/** 拼接 className，过滤掉 false / undefined / 空串 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

const integerFormatter = new Intl.NumberFormat('zh-CN')

/** 千分位整数：12345 → 12,345 */
export function formatInt(value: number): string {
  return integerFormatter.format(Math.round(value))
}

const compactFormatter = new Intl.NumberFormat('zh-CN', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** 紧凑计数：12345 → 1.2万 */
export function formatCompact(value: number): string {
  return compactFormatter.format(value)
}

/** 上下文长度：272000 → 272K，1000000 → 1M，1500 → 1.5K */
export function formatContextLength(tokens: number): string {
  if (tokens >= 1_000_000) return `${Number((tokens / 1_000_000).toFixed(1))}M`
  return `${Number((tokens / 1_000).toFixed(1))}K`
}

/**
 * 金额：带千分位。
 * digits 省略时自动判断 —— 小于 1 元的保留 4 位，避免显示成 0。
 */
export function formatMoney(value: number, currency = '¥', digits?: number): string {
  const resolved = digits ?? (Math.abs(value) > 0 && Math.abs(value) < 1 ? 4 : 2)
  // 用 Intl 取整而不是 toFixed：0.15 × 7.3 = 1.095，toFixed(2) 因二进制浮点得 1.09，
  // 而额度那边（formatQuota）走 Intl 得 1.10，同一个价格会在页面上显示成两个数
  const text = new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: resolved,
    maximumFractionDigits: resolved,
  }).format(value)

  return `${currency}${text}`
}

/** 百分比：0.8123 → 81.2% */
export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`
}
