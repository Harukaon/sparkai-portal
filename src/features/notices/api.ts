import { useQuery } from '@tanstack/react-query'

import { useSystemStatus } from '@/features/auth/hooks'
import type { Announcement } from '@/features/notices/types'
import { apiGet } from '@/shared/api/client'

export type { Announcement, AnnouncementType } from '@/features/notices/types'

/**
 * New API 的两种站内消息：
 * - 公告列表：后台「控制台设置 → 系统公告」，一条一条，随 /api/status 一起下发；
 * - 系统通知：后台「设置 → 公告」里的一段 Markdown，走 /api/notice。
 */
export function fetchNotice(): Promise<string> {
  return apiGet<string>('/api/notice', undefined, { skipAuth: true })
}

/** 公告列表：后台关了或没有内容就是空数组；按发布时间从新到旧 */
export function useAnnouncements(): Announcement[] {
  const status = useSystemStatus()
  const list = status.data?.announcements_enabled ? status.data.announcements : undefined
  return Array.isArray(list) ? list.filter((item) => typeof item?.content === 'string' && item.content.trim() !== '') : []
}

export function useNotice() {
  return useQuery({
    queryKey: ['site-notice'],
    queryFn: fetchNotice,
    staleTime: 5 * 60_000,
    retry: false,
  })
}
