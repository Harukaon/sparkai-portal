import type { Announcement } from '@/features/notices/api'

/**
 * 「看过没有」只记在本机浏览器里，不需要后端：
 * - 公告：记住看过的最新一条的发布时间，比它新的就算未读；
 * - 通知：记住内容指纹，后台改了内容就会重新弹一次。
 */
const ANNOUNCEMENT_KEY = 'sparkai.announcements.seen'
const NOTICE_KEY = 'sparkai.notice.seen'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // 隐私模式存不下：本次访问内不再提示即可
  }
}

function publishTime(item: Announcement): number {
  const time = Date.parse(item.publishDate)
  return Number.isFinite(time) ? time : 0
}

export function latestPublishTime(list: Announcement[]): number {
  return list.reduce((max, item) => Math.max(max, publishTime(item)), 0)
}

export function unreadCount(list: Announcement[], seenAt: number): number {
  return list.filter((item) => publishTime(item) > seenAt).length
}

export function readAnnouncementSeenAt(): number {
  const value = Number(read(ANNOUNCEMENT_KEY))
  return Number.isFinite(value) ? value : 0
}

export function markAnnouncementsSeen(list: Announcement[]): number {
  const latest = latestPublishTime(list)
  write(ANNOUNCEMENT_KEY, String(latest))
  return latest
}

/** 简单的字符串指纹（djb2），只用来判断通知内容变没变 */
export function fingerprint(text: string): string {
  let hash = 5381
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0
  }
  return `${text.length}:${(hash >>> 0).toString(36)}`
}

export function noticeAlreadySeen(content: string): boolean {
  return read(NOTICE_KEY) === fingerprint(content)
}

export function markNoticeSeen(content: string): void {
  write(NOTICE_KEY, fingerprint(content))
}
