/**
 * 环境配置的唯一读取口。
 * 业务代码不要直接读 import.meta.env，统一从这里取，方便以后加校验或改来源。
 */
import { tr } from '@/shared/i18n'

function readText(value: string | undefined, fallback: string): string {
  const text = (value ?? '').trim()
  return text === '' ? fallback : text
}

/** 中文站名 */
export const SITE_NAME_ZH = readText(import.meta.env.VITE_SITE_NAME_ZH, '火花AI')

/** 英文站名 */
export const SITE_NAME_EN = readText(import.meta.env.VITE_SITE_NAME_EN, 'SparkAI')

/** 空字符串表示同域请求（开发走 vite 代理，生产走网关转发） */
export const API_BASE_URL = readText(import.meta.env.VITE_API_BASE_URL, '')

export const IS_DEV = import.meta.env.DEV

export const IS_PROD = import.meta.env.PROD

/** 按当前语言取站名 */
export function siteName(): string {
  return tr(SITE_NAME_ZH, SITE_NAME_EN)
}

/** 拼接页面标题，如「控制台 · 火花AI」 */
export function pageTitle(page?: string): string {
  return page
    ? `${page} · ${siteName()}`
    : `${siteName()} · ${tr('AI 模型接口平台', 'AI Model API Platform')}`
}
