import { parseLoose } from '@/features/wallet/api'
import type { CreemProduct, TopupInfo } from '@/features/wallet/api'

export interface MethodOption {
  type: string
  name: string
  /** 这个支付方式的最低充值数量 */
  min: number
}

const GATEWAY_FLAGS: Record<string, keyof TopupInfo> = {
  stripe: 'enable_stripe_topup',
  waffo: 'enable_waffo_topup',
  waffo_pancake: 'enable_waffo_pancake_topup',
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/** 只列出后台真正开通的支付方式；易支付类方式受「在线充值」总开关控制。 */
export function paymentMethods(info: TopupInfo): MethodOption[] {
  const defaults: Record<string, number> = {
    stripe: info.stripe_min_topup,
    waffo: info.waffo_min_topup ?? info.min_topup,
    waffo_pancake: info.waffo_pancake_min_topup ?? info.min_topup,
  }
  return (info.pay_methods ?? [])
    .filter((method) => {
      const flag = GATEWAY_FLAGS[method.type]
      return flag ? Boolean(info[flag]) : info.enable_online_topup
    })
    .map((method) => ({
      type: method.type,
      name: method.name || method.type,
      min: Math.ceil(toNumber(method.min_topup, defaults[method.type] ?? info.min_topup ?? 1)),
    }))
}

export function amountOptions(info: TopupInfo): number[] {
  const options = parseLoose<unknown[]>(info.amount_options, [])
  return (Array.isArray(options) ? options : [])
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)
}

/** 折扣系数，例如 0.9 表示九折；没有配置就是 1。 */
export function discountFor(info: TopupInfo, amount: number): number {
  const table = parseLoose<Record<string, number>>(info.discount, {})
  const rate = Number(table?.[String(amount)])
  return Number.isFinite(rate) && rate > 0 && rate < 1 ? rate : 1
}

export function creemProducts(info: TopupInfo): CreemProduct[] {
  if (!info.enable_creem_topup) return []
  const products = parseLoose<CreemProduct[]>(info.creem_products, [])
  return Array.isArray(products) ? products.filter((item) => item?.productId) : []
}

export function onlineTopupAvailable(info: TopupInfo): boolean {
  return paymentMethods(info).length > 0 || creemProducts(info).length > 0
}
