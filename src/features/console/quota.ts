import { useMemo } from 'react'

import { useSystemStatus } from '@/features/auth/hooks'
import type { SystemStatus } from '@/features/auth/types'
import { useLang } from '@/shared/i18n'
import type { Lang } from '@/shared/i18n'

/**
 * New API 内部用整数「额度」记账，默认 500,000 额度 = 1 美元。
 * 中文界面换算成人民币显示，英文界面直接显示美元。
 */
export type QuotaUnit = 'USD' | 'CNY' | 'CUSTOM' | 'TOKENS'

export interface QuotaFormat {
  unit: QuotaUnit
  perUnit: number
  symbol: string
  rate: number
}

const DEFAULT_PER_UNIT = 500_000
const DEFAULT_USD_RATE = 7.3

function positive(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
}

/**
 * 按业务要求，金额币种只跟界面语言走，不跟随后台的美元/额度显示设置：
 * 中文 → 人民币（汇率用后台「美元汇率」usd_exchange_rate，缺省 7.3）；英文 → 美元（不换算）。
 */
export function quotaFormatFrom(status?: Partial<SystemStatus>, lang: Lang = 'zh'): QuotaFormat {
  const perUnit = positive(status?.quota_per_unit, DEFAULT_PER_UNIT)
  if (lang === 'en') {
    return { unit: 'USD', perUnit, symbol: '$', rate: 1 }
  }
  return {
    unit: 'CNY',
    perUnit,
    symbol: '¥',
    rate: positive(status?.usd_exchange_rate, DEFAULT_USD_RATE),
  }
}

/** 后台美元汇率：英文界面要把「按人民币收款」的实付金额折回美元时用 */
export function usdExchangeRate(status?: Partial<SystemStatus>): number {
  return positive(status?.usd_exchange_rate, DEFAULT_USD_RATE)
}

/** 当前币种的一个简短单位名，用在表头、输入框后缀等处 */
export function currencyCode(format: QuotaFormat): string {
  return format.unit === 'USD' ? 'USD' : 'CNY'
}

/** 美元金额 → 当前币种文本（模型单价等以美元计价的数据用） */
export function formatUsdAsCny(usd: number, format: QuotaFormat): string {
  return formatQuota(usd * format.perUnit, format)
}

/** 额度 → 给人看的金额；小额保留更多小数，避免单次请求显示成 0。 */
export function formatQuota(quota: number | null | undefined, format: QuotaFormat): string {
  if (quota == null || !Number.isFinite(quota)) return '—'
  if (format.unit === 'TOKENS') {
    return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(quota)
  }
  const value = (quota / format.perUnit) * format.rate
  const abs = Math.abs(value)
  const digits = abs > 0 && abs < 0.01 ? 6 : abs < 1 ? 4 : 2
  const text = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  }).format(abs)
  return `${value < 0 ? '-' : ''}${format.symbol}${text}`
}

/** 金额 → 内部额度，用于创建密钥时设置额度上限。 */
export function amountToQuota(amount: number, format: QuotaFormat): number {
  if (format.unit === 'TOKENS') return Math.round(amount)
  return Math.round((amount / format.rate) * format.perUnit)
}

export function quotaToAmount(quota: number, format: QuotaFormat): number {
  if (format.unit === 'TOKENS') return quota
  return (quota / format.perUnit) * format.rate
}

export function useQuotaFormat(): QuotaFormat {
  const status = useSystemStatus()
  const lang = useLang()
  return useMemo(() => quotaFormatFrom(status.data, lang), [status.data, lang])
}
