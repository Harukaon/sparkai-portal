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

/**
 * 金额：带千分位。
 * digits 省略时自动判断 —— 小于 1 元的保留 4 位，避免显示成 0。
 */
export function formatMoney(value: number, currency = '¥', digits?: number): string {
  const resolved = digits ?? (Math.abs(value) > 0 && Math.abs(value) < 1 ? 4 : 2)
  const [integer, decimal] = value.toFixed(resolved).split('.')
  const grouped = Number(integer).toLocaleString('zh-CN')

  return decimal === undefined ? `${currency}${grouped}` : `${currency}${grouped}.${decimal}`
}

/** 百分比：0.8123 → 81.2% */
export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`
}
