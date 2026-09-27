import axios from 'axios'

import { useAuthStore } from '@/features/auth/auth-store'
import type { AuthBundle } from '@/features/auth/types'
import { registerAuthHooks } from '@/shared/api/client'
import { API_BASE_URL } from '@/shared/lib/env'

/**
 * 登录会话的续期与退出。
 *
 * New API 的机制：登录拿到 15 分钟有效的访问令牌（放内存），
 * 同时服务端种一个 30 天的 HttpOnly 刷新 Cookie（只在 /api/user/auth 下发送）。
 * 令牌快过期或页面刷新后，调 /api/user/auth/refresh 用 Cookie 换一整包新的。
 *
 * 这里单独用一个不带拦截器的 axios，避免「续期请求本身又触发续期」的死循环。
 */
const authHttp = axios.create({
  baseURL: API_BASE_URL === '' ? undefined : API_BASE_URL,
  timeout: 15_000,
  withCredentials: true,
  headers: { 'Cache-Control': 'no-store', 'Accept-Language': 'zh-CN' },
})

/** 服务端在登录时额外种的非 HttpOnly 提示 Cookie，用来判断「值不值得去续期」 */
const SESSION_HINT_COOKIE = 'new_api_has_session=1'

/** 令牌剩余不足这么多秒就提前续期，避免请求发到一半过期 */
const REFRESH_BEFORE_SECONDS = 60

/** 多标签页同时续期时后端会返回「竞争」，稍等重试 */
const RACE_RETRY_DELAYS = [120, 300, 700]

function hasSessionHint(): boolean {
  return typeof document !== 'undefined' && document.cookie.split('; ').includes(SESSION_HINT_COOKIE)
}

function isAuthBundle(value: unknown): value is AuthBundle {
  if (!value || typeof value !== 'object') return false
  const bundle = value as Partial<AuthBundle>
  return (
    typeof bundle.access_token === 'string' &&
    bundle.access_token.length > 0 &&
    typeof bundle.access_expires_at === 'number' &&
    typeof bundle.user?.id === 'number' &&
    typeof bundle.session?.sid === 'string'
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function requestRefresh(attempt = 0, sendExpectedSID = true): Promise<boolean> {
  const sid = useAuthStore.getState().session?.sid
  try {
    const response = await authHttp.post('/api/user/auth/refresh', undefined, {
      headers: sendExpectedSID && sid ? { 'X-Auth-Session': sid } : undefined,
    })
    const bundle: unknown = response.data?.data
    if (response.data?.success && isAuthBundle(bundle)) {
      useAuthStore.getState().acceptBundle(bundle)
      return true
    }
    useAuthStore.getState().clear()
    return false
  } catch (error: unknown) {
    if (!axios.isAxiosError(error)) return false
    const status = error.response?.status ?? 0
    const code: unknown = error.response?.data?.code

    if (status === 401) {
      useAuthStore.getState().clear()
      return false
    }
    // 另一个标签页刚续期完：稍等片刻再试
    if (status === 409 && code === 'AUTH_REFRESH_RACE' && attempt < RACE_RETRY_DELAYS.length) {
      await sleep(RACE_RETRY_DELAYS[attempt] ?? 300)
      return requestRefresh(attempt + 1, sendExpectedSID)
    }
    // 另一个标签页换了账号：以 Cookie 里的会话为准
    if (status === 409 && code === 'AUTH_SESSION_MISMATCH' && sendExpectedSID) {
      return requestRefresh(0, false)
    }
    // 网络抖动、服务端 5xx：保留当前状态，不算退出
    return false
  }
}

let refreshing: Promise<boolean> | null = null

/** 续期一次；同一时间只会真的发一个请求，其余调用共用结果 */
export function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = requestRefresh().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

/** 给请求层用：取一个还能用的令牌，快过期就先续期 */
async function getAccessToken(): Promise<string | null> {
  const { accessToken, accessExpiresAt, status } = useAuthStore.getState()
  const now = Math.floor(Date.now() / 1000)
  if (accessToken && accessExpiresAt - now > REFRESH_BEFORE_SECONDS) {
    return accessToken
  }
  if (status === 'authenticated' || hasSessionHint()) {
    const ok = await refreshSession()
    return ok ? useAuthStore.getState().accessToken : null
  }
  return null
}

registerAuthHooks({
  getAccessToken,
  refresh: refreshSession,
  onUnauthorized: () => useAuthStore.getState().clear(),
})

let bootstrapping: Promise<void> | null = null

/**
 * 打开页面时恢复登录状态：有会话提示 Cookie 才去续期，
 * 没有就直接认定未登录，省一次注定失败的请求。
 */
export function bootstrapSession(): Promise<void> {
  if (!bootstrapping) {
    bootstrapping = (async () => {
      if (hasSessionHint()) {
        await refreshSession()
      }
      if (useAuthStore.getState().status === 'unknown') {
        useAuthStore.getState().clear()
      }
    })()
  }
  return bootstrapping
}

/** 接受一次登录结果（密码登录、二次验证、第三方登录都走这里） */
export function acceptLogin(bundle: AuthBundle): void {
  useAuthStore.getState().acceptBundle(bundle)
}

/** 只有服务端确认作废刷新 Cookie 才退出，失败时保留登录态供重试。 */
export async function logout(): Promise<void> {
  const sid = useAuthStore.getState().session?.sid
  await authHttp.post('/api/user/auth/logout', undefined, {
    headers: sid ? { 'X-Auth-Session': sid } : undefined,
  })
  useAuthStore.getState().clear()
}
