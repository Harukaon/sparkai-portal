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

/** 金额：0.0123 → ¥0.0123（小额保留 4 位，避免显示成 0） */
export function formatMoney(value: number, currency = '¥'): string {
  const digits = Math.abs(value) > 0 && Math.abs(value) < 1 ? 4 : 2
  return `${currency}${value.toFixed(digits)}`
}

/** 百分比：0.8123 → 81.2% */
export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`
}

/** 单价展示：每百万 token 的价格，如 1.5 → $1.50 / M */
export function formatUnitPrice(value: number, unit = 'M', symbol = '$'): string {
  return `${symbol}${value.toFixed(2)} / ${unit}`
}
