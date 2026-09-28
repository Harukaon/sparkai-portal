import { apiGet, apiPost, http } from '@/shared/api/client'

/** 工单服务（ticket-service/）的接口，和前台同域，挂在 /ticket-api 下 */
const BASE = '/ticket-api'

export type TicketStatus = 'open' | 'replied' | 'closed'
export type TicketCategory = 'topup' | 'billing' | 'api' | 'account' | 'other'

export interface Ticket {
  id: number
  title: string
  category: TicketCategory
  status: TicketStatus
  created_at: number
  updated_at: number
  message_count: number
  /** 只有管理员能看到提交人 */
  user?: { id: number; username: string; display_name: string; email: string }
}

export interface TicketMessage {
  id: number
  is_staff: boolean
  is_mine: boolean
  /** 普通用户看客服消息时为空，页面显示成「客服」 */
  author_name: string
  content: string
  images: string[]
  created_at: number
}

export interface TicketPage {
  items: Ticket[]
  total: number
  page: number
  page_size: number
}

export interface TicketListParams {
  page: number
  pageSize: number
  status?: TicketStatus
  /** 管理员查看全部 */
  all?: boolean
  keyword?: string
}

export function fetchTickets(params: TicketListParams): Promise<TicketPage> {
  return apiGet<TicketPage>(`${BASE}/tickets`, {
    p: params.page,
    page_size: params.pageSize,
    status: params.status || undefined,
    scope: params.all ? 'all' : undefined,
    keyword: params.all && params.keyword ? params.keyword : undefined,
  })
}

export function fetchTicket(id: number): Promise<{ ticket: Ticket; messages: TicketMessage[] }> {
  return apiGet(`${BASE}/tickets/${id}`)
}

export interface NewTicket {
  title: string
  category: TicketCategory
  content: string
  images: string[]
}

export function createTicket(input: NewTicket): Promise<Ticket> {
  return apiPost<Ticket>(`${BASE}/tickets`, input)
}

export function replyTicket(id: number, content: string, images: string[]): Promise<TicketMessage> {
  return apiPost<TicketMessage>(`${BASE}/tickets/${id}/messages`, { content, images })
}

export function setTicketStatus(id: number, status: TicketStatus): Promise<Ticket> {
  return apiPost<Ticket>(`${BASE}/tickets/${id}/status`, { status })
}

export function fetchTicketSummary(): Promise<{ is_admin: boolean; pending: number }> {
  return apiGet(`${BASE}/summary`)
}

/** 上传图片：请求体就是图片本身，返回图片编号 */
export function uploadTicketImage(file: File): Promise<{ id: string }> {
  return apiPost<{ id: string }>(`${BASE}/uploads`, file, {
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    timeout: 60_000,
  })
}

/**
 * 看图也要带登录令牌，所以不能直接 <img src>，先按二进制取回来再生成本地地址。
 */
export async function fetchTicketImage(id: string): Promise<Blob> {
  const response = await http.get<Blob>(`${BASE}/uploads/${id}`, { responseType: 'blob', timeout: 30_000 })
  return response.data
}
