import axios from 'axios'
import type { AxiosError } from 'axios'

import { API_BASE_URL } from '@/shared/lib/env'

/**
 * 全站唯一的 HTTP 出口。
 * 以后要加登录令牌、统一重试、埋点，都只改这里，业务代码不用动。
 */
export const http = axios.create({
  baseURL: API_BASE_URL === '' ? undefined : API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

/** 后端返回的错误体（约定：`{ error: "..." }`） */
interface ApiErrorBody {
  error?: string
  message?: string
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

http.interceptors.request.use((config) => {
  // TODO(鉴权): 登录完成后在此注入令牌，例如
  // config.headers.Authorization = `Bearer ${getToken()}`
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response) {
      const body = error.response.data
      const message = body?.error ?? body?.message ?? '请求失败，请稍后重试'
      return Promise.reject(new ApiError(message, error.response.status))
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new ApiError('请求超时，请检查网络后重试', 0))
    }

    return Promise.reject(new ApiError('网络异常，请检查网络后重试', 0))
  },
)
