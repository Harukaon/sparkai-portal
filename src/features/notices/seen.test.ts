import { beforeEach, describe, expect, it } from 'vitest'

import type { Announcement } from './types'
import {
  fingerprint,
  latestPublishTime,
  markAnnouncementsSeen,
  markNoticeSeen,
  noticeAlreadySeen,
  readAnnouncementSeenAt,
  unreadCount,
} from './seen'

const store = new Map<string, string>()

beforeEach(() => {
  store.clear()
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage
})

const list: Announcement[] = [
  { content: '新', publishDate: '2026-09-28T10:00:00+08:00' },
  { content: '旧', publishDate: '2026-09-20T10:00:00+08:00' },
]

describe('公告已读', () => {
  it('从没看过：全部算未读', () => {
    expect(unreadCount(list, readAnnouncementSeenAt())).toBe(2)
  })

  it('打开看过后：没有未读；之后再发的新公告算未读', () => {
    const seenAt = markAnnouncementsSeen(list)
    expect(seenAt).toBe(latestPublishTime(list))
    expect(unreadCount(list, readAnnouncementSeenAt())).toBe(0)
    const next = [{ content: '更新', publishDate: '2026-09-29T09:00:00+08:00' }, ...list]
    expect(unreadCount(next, readAnnouncementSeenAt())).toBe(1)
  })
})

describe('系统通知只弹一次', () => {
  it('看过同样内容不再弹，内容改了会再弹', () => {
    expect(noticeAlreadySeen('维护通知')).toBe(false)
    markNoticeSeen('维护通知')
    expect(noticeAlreadySeen('维护通知')).toBe(true)
    expect(noticeAlreadySeen('维护通知（已更新）')).toBe(false)
  })

  it('指纹对相同内容稳定、不同内容不同', () => {
    expect(fingerprint('abc')).toBe(fingerprint('abc'))
    expect(fingerprint('abc')).not.toBe(fingerprint('abd'))
  })
})
