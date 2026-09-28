import type { UploadFile } from 'antd'

import type { TicketCategory, TicketStatus } from '@/features/tickets/api'

/** 单张图片上限，和工单服务保持一致 */
export const MAX_IMAGE_BYTES = 1024 * 1024
export const MAX_IMAGES = 6
export const TITLE_MAX = 100
export const CONTENT_MAX = 5000
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

export const CATEGORY_LABELS: Record<TicketCategory, [string, string]> = {
  topup: ['充值问题', 'Top-up'],
  billing: ['扣费疑问', 'Billing'],
  api: ['接口报错', 'API error'],
  account: ['账号问题', 'Account'],
  other: ['其他', 'Other'],
}

export const STATUS_LABELS: Record<TicketStatus, { label: [string, string]; color: string }> = {
  open: { label: ['待处理', 'Open'], color: 'processing' },
  replied: { label: ['已回复', 'Replied'], color: 'success' },
  closed: { label: ['已关闭', 'Closed'], color: 'default' },
}

/** 选图时就先挡住不合规的，省得传上去才报错 */
export function imageProblem(file: { type: string; size: number }): 'type' | 'size' | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'type'
  if (file.size > MAX_IMAGE_BYTES) return 'size'
  return null
}

/** 已上传成功的图片编号 */
export function uploadedIds(files: UploadFile[]): string[] {
  return files.filter((file) => file.status === 'done' && typeof file.response?.id === 'string').map((file) => file.response.id as string)
}

export function isUploading(files: UploadFile[]): boolean {
  return files.some((file) => file.status === 'uploading')
}
