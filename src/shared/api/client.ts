import axios from 'axios'
import type { AxiosError, AxiosRequestConfig } from 'axios'

import { currentLang, tr } from '@/shared/i18n'
import { API_BASE_URL } from '@/shared/lib/env'

declare module 'axios' {
  interface AxiosRequestConfig {
    /** 不带登录令牌：登录、注册、公开数据等接口 */
    skipAuth?: boolean
    /** 内部标记：401 后已经刷新令牌重试过一次，避免死循环 */
    _authRetried?: boolean
  }
}

/** New API 的统一返回格式：业务失败时 HTTP 仍是 200，靠 success 区分 */
export interface ApiEnvelope<T> {
  success: boolean
  message?: string
  data?: T
  code?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/**
 * 登录态相关的钩子，由 features/auth 在启动时注册进来。
 * 这样请求层不用反向依赖业务模块，也就不会出现循环引用。
 */
interface AuthHooks {
  /** 取一个可用的访问令牌；快过期时会先自动续期 */
  getAccessToken: () => Promise<string | null>
  /** 强制续期一次，成功返回 true */
  refresh: () => Promise<boolean>
  /** 续期也救不回来：清掉登录态 */
  onUnauthorized: () => void
}

let authHooks: AuthHooks | null = null

export function registerAuthHooks(hooks: AuthHooks): void {
  authHooks = hooks
}

/**
 * 全站唯一的 HTTP 出口。
 * withCredentials：登录后服务端会种一个只在 /api/user/auth 下生效的刷新 Cookie，需要带上。
 */
export const http = axios.create({
  baseURL: API_BASE_URL === '' ? undefined : API_BASE_URL,
  timeout: 15_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

http.interceptors.request.use(async (config) => {
  config.headers.set('Accept-Language', currentLang() === 'zh' ? 'zh-CN' : 'en')
  if (!config.skipAuth && authHooks) {
    const token = await authHooks.getAccessToken()
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const config = error.config
    const status = error.response?.status ?? 0

    // 令牌失效：续期一次再重试原请求，还不行就当作已退出
    if (status === 401 && config && !config.skipAuth && authHooks) {
      if (!config._authRetried) {
        config._authRetried = true
        if (await authHooks.refresh()) {
          return http.request(config)
        }
      }
      // 连续 401 表示服务端不再认可这次会话，不能继续展示旧账号。
      authHooks.onUnauthorized()
    }

    return Promise.reject(toApiError(error))
  },
)

function toApiError(error: AxiosError<ApiEnvelope<unknown>>): ApiError {
  if (error.response) {
    const { status, data } = error.response
    if (status === 429) {
      return new ApiError(tr('操作太频繁了，请稍等一会儿再试', 'Too many requests. Please try again shortly.'), status, data?.code)
    }
    return new ApiError(data?.message || tr(`请求失败（${status}）`, `Request failed (${status})`), status, data?.code)
  }
  if (error.code === 'ECONNABORTED') {
    return new ApiError(tr('请求超时，请检查网络后重试', 'Request timed out. Check your network and try again.'), 0)
  }
  return new ApiError(tr('连不上服务器，请检查网络后重试', 'Cannot reach the server. Check your network and try again.'), 0)
}

function unwrap<T>(envelope: ApiEnvelope<T> | undefined, status: number): T {
  if (!envelope || envelope.success !== true) {
    throw new ApiError(envelope?.message || tr('操作失败，请稍后重试', 'Something went wrong. Please try again later.'), status, envelope?.code)
  }
  return envelope.data as T
}

export async function apiGet<T>(
  url: string,
  params?: Record<string, unknown>,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await http.get<ApiEnvelope<T>>(url, { ...config, params })
  return unwrap(response.data, response.status)
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await http.post<ApiEnvelope<T>>(url, body, config)
  return unwrap(response.data, response.status)
}

export async function apiPut<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await http.put<ApiEnvelope<T>>(url, body, config)
  return unwrap(response.data, response.status)
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await http.delete<ApiEnvelope<T>>(url, config)
  return unwrap(response.data, response.status)
}

/** 把任意异常转成给人看的一句话 */
export function errorMessage(error: unknown, fallback = tr('操作失败，请稍后重试', 'Something went wrong. Please try again later.')): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}
