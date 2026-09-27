import type { PageResult } from '@/features/console/usage'
import { ApiError, apiGet, apiPost, http } from '@/shared/api/client'

export interface PayMethod {
  name: string
  type: string
  min_topup?: number | string
}

export interface CreemProduct {
  name: string
  productId: string
  price: number
  quota: number
  currency: string
}

export interface TopupInfo {
  enable_online_topup: boolean
  enable_stripe_topup: boolean
  enable_creem_topup?: boolean
  enable_waffo_topup?: boolean
  enable_waffo_pancake_topup?: boolean
  /** 兑换码是否可用；站长未完成支付合规确认时为 false */
  enable_redemption?: boolean
  payment_compliance_confirmed?: boolean
  pay_methods: PayMethod[] | null
  min_topup: number
  stripe_min_topup: number
  waffo_min_topup?: number
  waffo_pancake_min_topup?: number
  amount_options: number[] | string | null
  /** 充值数量 → 折扣系数 */
  discount: Record<string, number> | string | null
  creem_products?: CreemProduct[] | string | null
  /** 站长配置的外部购买兑换码链接 */
  topup_link?: string
}

/** 后台有些配置是 JSON 字符串，有些是数组对象，这里统一解析，解析失败按空处理。 */
export function parseLoose<T>(value: unknown, fallback: T): T {
  if (value == null || value === '') return fallback
  if (typeof value !== 'string') return value as T
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function fetchTopupInfo() {
  return apiGet<TopupInfo>('/api/user/topup/info')
}

/** 兑换码充值，成功返回到账的内部额度 */
export function redeemCode(key: string) {
  return apiPost<number>('/api/user/topup', { key: key.trim() })
}

export interface TopupRecord {
  id: number
  amount: number
  money: number
  trade_no: string
  payment_method: string
  create_time: number
  complete_time?: number
  status: 'success' | 'pending' | 'expired' | string
}

export async function fetchTopupHistory(page: number, pageSize: number) {
  const result = await apiGet<PageResult<TopupRecord>>('/api/user/topup/self', { p: page, page_size: pageSize })
  return { ...result, items: result.items ?? [] }
}

/**
 * 支付相关接口沿用老格式：{ message: "success" | "error", data }，
 * 出错时错误说明放在 data 里，不能套用通用的 success 拆包。
 */
interface LegacyBody<T> {
  success?: boolean
  message?: string
  data?: T | string
  url?: string
}

async function legacyPost<T>(url: string, body: unknown): Promise<{ data: T; url?: string }> {
  const response = await http.post<LegacyBody<T>>(url, body)
  const result = response.data
  if (result?.success === true || result?.message === 'success') {
    return { data: result.data as T, url: result.url }
  }
  const reason =
    typeof result?.data === 'string' && result.data
      ? result.data
      : result?.message && result.message !== 'error'
        ? result.message
        : '操作失败，请稍后重试'
  throw new ApiError(reason, response.status)
}

const AMOUNT_ENDPOINT: Record<string, string> = {
  stripe: '/api/user/stripe/amount',
  waffo: '/api/user/waffo/amount',
  waffo_pancake: '/api/user/waffo-pancake/amount',
}

/** 试算这次要付多少钱（按站长设置的充值价格、分组倍率和折扣）。 */
export async function quotePayment(method: string, amount: number): Promise<string> {
  const { data } = await legacyPost<string>(AMOUNT_ENDPOINT[method] ?? '/api/user/amount', { amount })
  return String(data)
}

export type PaymentTarget =
  | { kind: 'link'; url: string }
  | { kind: 'form'; url: string; params: Record<string, unknown> }

/** 向 New API 下单，拿到跳转支付页所需的信息；这里不做任何扣款。 */
export async function createPayment(method: string, amount: number): Promise<PaymentTarget> {
  if (method === 'stripe') {
    const { data } = await legacyPost<{ pay_link: string }>('/api/user/stripe/pay', { amount, payment_method: 'stripe' })
    return { kind: 'link', url: data.pay_link }
  }
  if (method === 'waffo') {
    const { data } = await legacyPost<{ payment_url?: string } | string>('/api/user/waffo/pay', { amount })
    return { kind: 'link', url: typeof data === 'string' ? data : (data.payment_url ?? '') }
  }
  if (method === 'waffo_pancake') {
    const { data } = await legacyPost<{ checkout_url?: string } | string>('/api/user/waffo-pancake/pay', { amount })
    return { kind: 'link', url: typeof data === 'string' ? data : (data.checkout_url ?? '') }
  }
  const { data, url } = await legacyPost<Record<string, unknown>>('/api/user/pay', { amount, payment_method: method })
  if (!url) throw new ApiError('支付地址缺失，请联系站长', 200)
  return { kind: 'form', url, params: data ?? {} }
}

export async function createCreemPayment(productId: string): Promise<PaymentTarget> {
  const { data } = await legacyPost<{ checkout_url: string }>('/api/user/creem/pay', {
    product_id: productId,
    payment_method: 'creem',
  })
  return { kind: 'link', url: data.checkout_url }
}

/**
 * 只允许跳转到 http(s) 支付页，防止被注入 javascript: 之类的地址。
 * 在当前页跳转：下单是异步的，新开窗口会被浏览器当成弹窗拦截。
 */
export function openPayment(target: PaymentTarget): void {
  const parsed = new URL(target.url, window.location.origin)
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('支付地址不安全，已阻止跳转')
  }
  if (target.kind === 'link') {
    window.location.assign(parsed.toString())
    return
  }
  const form = document.createElement('form')
  form.action = parsed.toString()
  form.method = 'POST'
  for (const [name, value] of Object.entries(target.params)) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = String(value)
    form.appendChild(input)
  }
  document.body.appendChild(form)
  form.submit()
  form.remove()
}
