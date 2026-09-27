import { useMemo } from 'react'

import { useSystemStatus } from '@/features/auth/hooks'
import type { SystemStatus } from '@/features/auth/types'

/**
 * New API 内部用整数「额度」记账，默认 500,000 额度 = 1 美元。
 * 后台可设置余额按美元、人民币、自定义货币或原始额度显示，这里完全跟随后台设置。
 */
export type QuotaUnit = 'USD' | 'CNY' | 'CUSTOM' | 'TOKENS'

export interface QuotaFormat {
  unit: QuotaUnit
  perUnit: number
  symbol: string
  rate: number
}

const DEFAULT_PER_UNIT = 500_000

function positive(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
}

export function quotaFormatFrom(status?: Partial<SystemStatus>): QuotaFormat {
  const perUnit = positive(status?.quota_per_unit, DEFAULT_PER_UNIT)
  const declared = status?.quota_display_type?.toUpperCase()
  const unit = declared ?? (status?.display_in_currency === false ? 'TOKENS' : 'USD')
  switch (unit) {
    case 'CNY':
      return { unit: 'CNY', perUnit, symbol: '¥', rate: positive(status?.usd_exchange_rate, 1) }
    case 'CUSTOM':
      return {
        unit: 'CUSTOM',
        perUnit,
        symbol: status?.custom_currency_symbol || '¤',
        rate: positive(status?.custom_currency_exchange_rate, 1),
      }
    case 'TOKENS':
      return { unit: 'TOKENS', perUnit, symbol: '', rate: 1 }
    default:
      return { unit: 'USD', perUnit, symbol: '$', rate: 1 }
  }
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
  return useMemo(() => quotaFormatFrom(status.data), [status.data])
}
