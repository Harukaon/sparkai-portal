import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'

import { quotaFormatFrom } from '@/features/console/quota'
import type { ApiKey } from '@/features/keys/api'

import { EMPTY_KEY_FORM, fromKey, nameBytes, toKeyInput } from './form'

const cny = quotaFormatFrom({ quota_per_unit: 500_000, usd_exchange_rate: 7.3 })

describe('密钥表单', () => {
  it('不限额度、永不过期时按 New API 约定提交', () => {
    const input = toKeyInput({ ...EMPTY_KEY_FORM, name: ' 生产环境 ' }, cny)
    expect(input).toMatchObject({ name: '生产环境', unlimited_quota: true, remain_quota: 0, expired_time: -1 })
  })

  it('额度上限按人民币金额换算成内部额度，模型和 IP 限制整理成后端格式', () => {
    const expires = dayjs('2027-01-01T00:00:00')
    const input = toKeyInput({
      ...EMPTY_KEY_FORM,
      name: 'ci',
      quotaMode: 'limited',
      amount: 73,
      expiryMode: 'date',
      expiresAt: expires,
      limitModels: true,
      models: ['gpt-4o', 'claude-sonnet'],
      allowIps: ' 1.1.1.1 \n\n10.0.0.0/8 ',
    }, cny)
    expect(input).toMatchObject({
      unlimited_quota: false,
      remain_quota: 5_000_000,
      expired_time: expires.unix(),
      model_limits_enabled: true,
      model_limits: 'gpt-4o,claude-sonnet',
      allow_ips: '1.1.1.1\n10.0.0.0/8',
    })
  })

  it('编辑时把已有密钥还原成表单值', () => {
    const key = {
      id: 1, name: 'x', key: 'ab**cd', status: 1, created_time: 0, accessed_time: 0,
      expired_time: -1, remain_quota: 1_000_000, used_quota: 0, unlimited_quota: false,
      model_limits_enabled: true, model_limits: 'a,b', allow_ips: '', group: 'vip',
    } satisfies ApiKey
    expect(fromKey(key, cny)).toMatchObject({ quotaMode: 'limited', amount: 14.6, expiryMode: 'never', models: ['a', 'b'], group: 'vip' })
  })

  it('名称长度按字节计算，一个汉字 3 字节', () => {
    expect(nameBytes('abc')).toBe(3)
    expect(nameBytes('密钥')).toBe(6)
  })
})
