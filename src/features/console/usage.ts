import { apiGet } from '@/shared/api/client'

/** New API 日志类型：普通用户能看到的记录 */
export const LOG_TYPES: Record<number, [string, string]> = {
  1: ['充值', 'Top-up'],
  2: ['消费', 'Usage'],
  3: ['管理', 'Manage'],
  4: ['系统', 'System'],
  5: ['错误', 'Error'],
  6: ['退款', 'Refund'],
  7: ['登录', 'Sign-in'],
}

export interface UsageLog {
  id: number
  created_at: number
  type: number
  content: string
  token_name: string
  model_name: string
  quota: number
  prompt_tokens: number
  completion_tokens: number
  use_time: number
  is_stream: boolean
  group?: string
  request_id?: string
}

export interface PageResult<T> {
  items: T[] | null
  total: number
  page: number
  page_size: number
}

export interface LogFilters {
  type?: number
  model_name?: string
  token_name?: string
  start_timestamp?: number
  end_timestamp?: number
}

export type RangePreset = 'today' | '7d' | '30d' | 'all'

export const RANGE_LABELS: Record<RangePreset, [string, string]> = {
  today: ['今天', 'Today'],
  '7d': ['近 7 天', 'Last 7 days'],
  '30d': ['近 30 天', 'Last 30 days'],
  all: ['全部时间', 'All time'],
}

/** 按浏览器本地时区的整天计算；New API 存的是 Unix 秒。 */
export function rangeFor(preset: RangePreset, now = new Date()): Pick<LogFilters, 'start_timestamp' | 'end_timestamp'> {
  if (preset === 'all') return {}
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  if (preset === '7d') start.setDate(start.getDate() - 6)
  if (preset === '30d') start.setDate(start.getDate() - 29)
  return {
    start_timestamp: Math.floor(start.getTime() / 1000),
    end_timestamp: Math.floor(now.getTime() / 1000),
  }
}

/**
 * 模型名「包含」搜索：New API 只在带 % 时做模糊匹配，且关键词至少 2 个字符。
 * 用户已经自己写了 % 就原样交给后端。
 */
export function containsPattern(value: string): string {
  const text = value.trim()
  if (!text || text.includes('%')) return text
  return text.length >= 2 ? `%${text}%` : text
}

function cleanFilters(filters: LogFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === '' || value === 0) continue
    params[key] = typeof value === 'string' ? value.trim() : value
  }
  return params
}

export async function fetchUsageLogs(filters: LogFilters, page: number, pageSize: number) {
  const result = await apiGet<PageResult<UsageLog>>('/api/log/self', {
    ...cleanFilters(filters),
    p: page,
    page_size: pageSize,
  })
  return { ...result, items: result.items ?? [] }
}

/** 消费合计：后端固定只统计「消费」类型，不会把充值算进花费。 */
export function fetchSpend(filters: LogFilters) {
  return apiGet<{ quota: number; rpm: number; tpm: number }>('/api/log/self/stat', cleanFilters(filters))
}

export interface QuotaDatum {
  model_name: string
  created_at: number
  count: number
  quota: number
  token_used: number
}

export interface DayUsage {
  key: string
  label: string
  quota: number
  count: number
  tokens: number
}

function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** 把按小时汇总的用量合并成最近 N 天，没有数据的日子补 0。 */
export function dailyUsage(data: QuotaDatum[], days: number, now = new Date()): DayUsage[] {
  const buckets = new Map<string, DayUsage>()
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now)
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - offset)
    buckets.set(dayKey(date), {
      key: dayKey(date),
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      quota: 0,
      count: 0,
      tokens: 0,
    })
  }
  for (const item of data) {
    const bucket = buckets.get(dayKey(new Date(item.created_at * 1000)))
    if (!bucket) continue
    bucket.quota += item.quota
    bucket.count += item.count
    bucket.tokens += item.token_used
  }
  return Array.from(buckets.values())
}

/** 近 7 天按天用量；接口只接受 30 天以内的范围。 */
export async function fetchWeeklyUsage(now = new Date()): Promise<DayUsage[]> {
  const range = rangeFor('7d', now)
  const data = await apiGet<QuotaDatum[] | null>('/api/data/self', range)
  return dailyUsage(data ?? [], 7, now)
}
