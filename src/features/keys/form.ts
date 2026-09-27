import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'

import { amountToQuota, quotaToAmount } from '@/features/console/quota'
import type { QuotaFormat } from '@/features/console/quota'
import type { ApiKey, KeyInput } from '@/features/keys/api'

export interface KeyFormValues {
  name: string
  quotaMode: 'unlimited' | 'limited'
  amount?: number
  expiryMode: 'never' | 'date'
  expiresAt?: Dayjs
  group: string
  limitModels: boolean
  models: string[]
  allowIps: string
}

export const EMPTY_KEY_FORM: KeyFormValues = {
  name: '',
  quotaMode: 'unlimited',
  expiryMode: 'never',
  group: '',
  limitModels: false,
  models: [],
  allowIps: '',
}

/** 后端按 UTF-8 字节数限制名称长度（50），一个汉字占 3 个字节。 */
export function nameBytes(name: string): number {
  return new TextEncoder().encode(name).length
}

export function toKeyInput(values: KeyFormValues, format: QuotaFormat): KeyInput {
  const limited = values.quotaMode === 'limited'
  return {
    name: values.name.trim(),
    unlimited_quota: !limited,
    remain_quota: limited ? amountToQuota(values.amount ?? 0, format) : 0,
    expired_time:
      values.expiryMode === 'date' && values.expiresAt ? values.expiresAt.unix() : -1,
    group: values.group,
    model_limits_enabled: values.limitModels && values.models.length > 0,
    model_limits: values.limitModels ? values.models.join(',') : '',
    allow_ips: values.allowIps
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n'),
  }
}

export function fromKey(key: ApiKey, format: QuotaFormat): KeyFormValues {
  const models = key.model_limits ? key.model_limits.split(',').map((item) => item.trim()).filter(Boolean) : []
  return {
    name: key.name,
    quotaMode: key.unlimited_quota ? 'unlimited' : 'limited',
    amount: key.unlimited_quota ? undefined : Number(quotaToAmount(key.remain_quota, format).toFixed(6)),
    expiryMode: key.expired_time === -1 ? 'never' : 'date',
    expiresAt: key.expired_time === -1 ? undefined : dayjs.unix(key.expired_time),
    group: key.group ?? '',
    limitModels: key.model_limits_enabled,
    models,
    allowIps: key.allow_ips ?? '',
  }
}
