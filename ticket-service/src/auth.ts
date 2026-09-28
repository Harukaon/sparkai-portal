/**
 * 身份完全交给 New API 判断：把前端带来的登录令牌原样转给 /api/user/self，
 * 能拿到用户就是登录了，role >= 10 就是管理员。工单服务自己不存任何账号密码。
 */
export interface Viewer {
  id: number
  username: string
  displayName: string
  email: string
  isAdmin: boolean
}

interface CacheEntry {
  viewer: Viewer | null
  expiresAt: number
}

/** 同一个令牌 30 秒内不重复去问 New API，避免每个请求都多打一次后端 */
const CACHE_MS = 30_000
const ADMIN_ROLE = 10

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>

export class Authenticator {
  private readonly cache = new Map<string, CacheEntry>()
  private readonly newApiBase: string
  private readonly fetcher: Fetcher

  // 注意：Workers 里不能把全局 fetch 直接存成成员再调用（会报 Illegal invocation），要包一层
  constructor(newApiBase: string, fetcher: Fetcher = (url, init) => fetch(url, init)) {
    this.newApiBase = newApiBase
    this.fetcher = fetcher
  }

  async resolve(authorization: string | undefined): Promise<Viewer | null> {
    if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) return null
    const now = Date.now()
    const cached = this.cache.get(authorization)
    if (cached && cached.expiresAt > now) return cached.viewer

    const viewer = await this.lookup(authorization)
    this.cache.set(authorization, { viewer, expiresAt: now + CACHE_MS })
    if (this.cache.size > 5000) this.prune(now)
    return viewer
  }

  private async lookup(authorization: string): Promise<Viewer | null> {
    let response: Response
    try {
      response = await this.fetcher(`${this.newApiBase}/api/user/self`, {
        headers: { Authorization: authorization, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      })
    } catch (error) {
      // New API 连不上：当成暂时无法确认身份，由上层返回 503，而不是误判成未登录
      console.error('[ticket-service] auth backend unreachable:', error instanceof Error ? error.message : error)
      throw new Error('auth backend unavailable')
    }
    if (response.status === 401 || response.status === 403) return null
    if (!response.ok) {
      console.error('[ticket-service] auth backend returned', response.status, response.headers.get('server'), response.headers.get('cf-mitigated'))
      throw new Error(`auth backend returned ${response.status}`)
    }

    const body = (await response.json().catch(() => null)) as {
      success?: boolean
      data?: { id?: unknown; username?: unknown; display_name?: unknown; email?: unknown; role?: unknown; status?: unknown }
    } | null
    const user = body?.success ? body.data : undefined
    if (!user || typeof user.id !== 'number') return null
    if (typeof user.status === 'number' && user.status !== 1) return null

    return {
      id: user.id,
      username: String(user.username ?? ''),
      displayName: String(user.display_name ?? ''),
      email: String(user.email ?? ''),
      isAdmin: typeof user.role === 'number' && user.role >= ADMIN_ROLE,
    }
  }

  private prune(now: number): void {
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(key)
    }
  }
}
