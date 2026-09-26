/**
 * 环境配置的唯一读取口。
 * 业务代码不要直接读 import.meta.env，统一从这里取，方便以后加校验或改来源。
 */

function readText(value: string | undefined, fallback: string): string {
  const text = (value ?? '').trim()
  return text === '' ? fallback : text
}

export const SITE_NAME = readText(import.meta.env.VITE_SITE_NAME, 'Relay')

export const SITE_TITLE_SUFFIX = readText(import.meta.env.VITE_SITE_TITLE_SUFFIX, 'AI 接口中转站')

/** 空字符串表示同域请求（开发走 vite 代理，生产走网关转发） */
export const API_BASE_URL = readText(import.meta.env.VITE_API_BASE_URL, '')

export const IS_DEV = import.meta.env.DEV

export const IS_PROD = import.meta.env.PROD

/** 拼接页面标题，如「控制台 · Relay」 */
export function pageTitle(page?: string): string {
  return page ? `${page} · ${SITE_NAME}` : `${SITE_NAME} · ${SITE_TITLE_SUFFIX}`
}
