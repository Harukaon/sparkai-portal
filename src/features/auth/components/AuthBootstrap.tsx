import { useEffect } from 'react'
import type { ReactNode } from 'react'

import { captureAffiliateCode } from '@/features/auth/affiliate'
import { bootstrapSession } from '@/features/auth/session'

/**
 * 应用启动时做两件事：记下链接里的邀请码；用刷新 Cookie 恢复登录状态。
 * 不阻塞渲染 —— 首页这类公开页面不需要等登录状态。
 */
export function AuthBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    captureAffiliateCode()
    void bootstrapSession()
  }, [])

  return children
}
