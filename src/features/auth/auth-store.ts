import { create } from 'zustand'

import type { AuthBundle, AuthUser, LoginSession } from '@/features/auth/types'

/**
 * unknown：刚打开页面，还没确认登录状态（此时不要把人踢去登录页）
 * authenticated：已登录
 * anonymous：确认未登录
 */
export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous'

interface AuthState {
  status: AuthStatus
  /**
   * 访问令牌只放内存，不写 localStorage：
   * 页面刷新后靠服务端的刷新 Cookie 换一个新的，被盗风险小很多。
   */
  accessToken: string | null
  accessExpiresAt: number
  user: AuthUser | null
  session: LoginSession | null

  acceptBundle: (bundle: AuthBundle) => void
  updateUser: (user: AuthUser) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'unknown',
  accessToken: null,
  accessExpiresAt: 0,
  user: null,
  session: null,

  acceptBundle: (bundle) =>
    set({
      status: 'authenticated',
      accessToken: bundle.access_token,
      accessExpiresAt: bundle.access_expires_at,
      user: bundle.user,
      session: bundle.session,
    }),

  updateUser: (user) => set({ user }),

  clear: () =>
    set({
      status: 'anonymous',
      accessToken: null,
      accessExpiresAt: 0,
      user: null,
      session: null,
    }),
}))
