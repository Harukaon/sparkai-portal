import type { PageResult } from '@/features/console/usage'
import { apiDelete, apiGet, apiPost, apiPut } from '@/shared/api/client'

/** 1 启用 / 2 已停用 / 3 已过期 / 4 额度用完 */
export const KEY_STATUS: Record<number, { label: [string, string]; color?: string }> = {
  1: { label: ['启用中', 'Active'] as [string, string], color: 'success' },
  2: { label: ['已停用', 'Disabled'] as [string, string] },
  3: { label: ['已过期', 'Expired'] as [string, string], color: 'warning' },
  4: { label: ['额度用完', 'Quota used up'] as [string, string], color: 'error' },
}

export interface ApiKey {
  id: number
  name: string
  /** 列表里永远是打码后的密钥，完整密钥要单独取 */
  key: string
  status: number
  created_time: number
  accessed_time: number
  /** -1 表示永不过期 */
  expired_time: number
  remain_quota: number
  used_quota: number
  unlimited_quota: boolean
  model_limits_enabled: boolean
  model_limits: string
  allow_ips: string
  group: string
}

export interface KeyInput {
  name: string
  remain_quota: number
  unlimited_quota: boolean
  expired_time: number
  group: string
  model_limits_enabled: boolean
  model_limits: string
  allow_ips: string
}

/** New API 存的是不带前缀的密钥，给用户时统一加上 sk- */
export function withPrefix(key: string): string {
  return key.startsWith('sk-') ? key : `sk-${key}`
}

export async function fetchKeys(page: number, pageSize: number) {
  const result = await apiGet<PageResult<ApiKey>>('/api/token/', { p: page, size: pageSize })
  return { ...result, items: result.items ?? [] }
}

export async function fetchFullKey(id: number): Promise<string> {
  const result = await apiPost<{ key: string }>(`/api/token/${id}/key`)
  return withPrefix(result.key)
}

export async function createKey(input: KeyInput): Promise<void> {
  await apiPost<unknown>('/api/token/', { ...input, cross_group_retry: false })
}

export async function updateKey(id: number, input: KeyInput): Promise<void> {
  await apiPut<unknown>('/api/token/', { id, ...input })
}

export async function setKeyStatus(id: number, enabled: boolean): Promise<void> {
  await apiPut<unknown>('/api/token/', { id, status: enabled ? 1 : 2 }, { params: { status_only: true } })
}

export async function deleteKey(id: number): Promise<void> {
  await apiDelete<unknown>(`/api/token/${id}`)
}

export interface UsableGroup {
  ratio: number | string
  desc: string
}

export function fetchUsableGroups() {
  return apiGet<Record<string, UsableGroup>>('/api/user/self/groups')
}

export function fetchUserModels() {
  return apiGet<string[] | null>('/api/user/models')
}
