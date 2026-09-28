/** 后台「控制台设置 → 系统公告」里的一条公告，字段名与 New API 一致 */
export type AnnouncementType = 'default' | 'ongoing' | 'success' | 'warning' | 'error'

export interface Announcement {
  content: string
  /** RFC3339 时间字符串 */
  publishDate: string
  type?: AnnouncementType
  /** 一句附加说明（后台限 100 字） */
  extra?: string
}
