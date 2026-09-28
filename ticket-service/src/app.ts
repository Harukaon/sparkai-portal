import type { Authenticator, Viewer } from './auth.ts'
import { sniffImage } from './images.ts'
import { CATEGORIES, ImageNotAvailableError, STATUSES } from './store.ts'
import type { MessageRow, TicketCategory, TicketRow, TicketStatus, TicketStore } from './store.ts'

/**
 * 工单接口，统一挂在 /ticket-api 下，返回格式和 New API 一样：{ success, message, data }。
 * 用标准的 Request/Response 写，同一份代码既能跑在 Cloudflare Workers，也能跑在 Node。
 */
export const PREFIX = '/ticket-api'

const LIMITS = {
  titleMax: 100,
  contentMax: 5000,
  imagesPerMessage: 6,
  /** 一个人最多同时挂着多少张没关的工单 */
  activePerUser: 20,
  /** 每小时最多新建多少张工单 / 上传多少张图 */
  createPerHour: 10,
  uploadPerHour: 60,
  jsonBodyBytes: 64 * 1024,
}

type T = (zh: string, en: string) => string

class HttpError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** 简单的滑动窗口限流，按「用户 + 动作」计数，只放内存里（Workers 下按实例计，够挡住刷单） */
class RateLimiter {
  private readonly hits = new Map<string, number[]>()

  allow(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    const recent = (this.hits.get(key) ?? []).filter((time) => now - time < windowMs)
    if (recent.length >= limit) {
      this.hits.set(key, recent)
      return false
    }
    recent.push(now)
    this.hits.set(key, recent)
    return true
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}

function ok(data: unknown): Response {
  return json(200, { success: true, message: '', data })
}

async function readBody(request: Request, maxBytes: number, tooLarge: string): Promise<Uint8Array> {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) throw new HttpError(413, tooLarge)
  if (!request.body) return new Uint8Array()
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maxBytes) {
      await reader.cancel()
      throw new HttpError(413, tooLarge)
    }
    chunks.push(value)
  }
  const out = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

async function readJson(request: Request, t: T): Promise<Record<string, unknown>> {
  const raw = await readBody(request, LIMITS.jsonBodyBytes, t('内容太长了', 'Request body is too large'))
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(raw) || '{}')
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
  } catch {
    // 落到下面统一报错
  }
  throw new HttpError(400, t('请求格式不对', 'Invalid request body'))
}

function positiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback
}

/** 用户看到的工单：不暴露别人的信息；管理员额外能看到提交人 */
function ticketView(ticket: TicketRow, viewer: Viewer) {
  const base = {
    id: ticket.id,
    title: ticket.title,
    category: ticket.category,
    status: ticket.status,
    created_at: ticket.created_at,
    updated_at: ticket.updated_at,
    message_count: ticket.message_count,
  }
  if (!viewer.isAdmin) return base
  return { ...base, user: { id: ticket.user_id, username: ticket.username, display_name: ticket.display_name, email: ticket.email } }
}

/** 普通用户看不到客服的账号名，只显示「客服」 */
function messageView(message: MessageRow & { images: string[] }, viewer: Viewer) {
  const isStaff = message.is_staff === 1
  return {
    id: message.id,
    is_staff: isStaff,
    is_mine: message.author_id === viewer.id,
    author_name: isStaff && !viewer.isAdmin ? '' : message.author_name,
    content: message.content,
    images: message.images,
    created_at: message.created_at,
  }
}

export interface AppDeps {
  store: TicketStore
  auth: Authenticator
  maxImageBytes: number
}

export function createHandler({ store, auth, maxImageBytes }: AppDeps) {
  const limiter = new RateLimiter()

  function parseContent(body: Record<string, unknown>, t: T): { content: string; imageIds: string[] } {
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    const imageIds = Array.isArray(body.images) ? body.images.filter((id): id is string => typeof id === 'string') : []
    if (!content && imageIds.length === 0) throw new HttpError(400, t('请填写问题描述', 'Please describe the issue'))
    if (content.length > LIMITS.contentMax) {
      throw new HttpError(400, t(`描述最多 ${LIMITS.contentMax} 字`, `Description is limited to ${LIMITS.contentMax} characters`))
    }
    if (imageIds.length > LIMITS.imagesPerMessage) {
      throw new HttpError(400, t(`每次最多 ${LIMITS.imagesPerMessage} 张图片`, `Up to ${LIMITS.imagesPerMessage} images per message`))
    }
    if (new Set(imageIds).size !== imageIds.length) throw new HttpError(400, t('图片重复了', 'Duplicate images'))
    return { content, imageIds }
  }

  async function loadOwnTicket(id: number, viewer: Viewer, t: T): Promise<TicketRow> {
    const ticket = Number.isInteger(id) ? await store.getTicket(id) : undefined
    // 不是自己的单一律当作不存在，不暴露「这个编号有别人的工单」
    if (!ticket || (!viewer.isAdmin && ticket.user_id !== viewer.id)) {
      throw new HttpError(404, t('工单不存在', 'Ticket not found'))
    }
    return ticket
  }

  async function route(request: Request, viewer: Viewer, url: URL, t: T): Promise<Response> {
    const path = url.pathname.slice(PREFIX.length) || '/'
    const method = request.method

    // 未处理数量：管理员看「待处理」，用户看「客服已回复」，给侧边栏小红点用
    if (path === '/summary' && method === 'GET') {
      return ok(
        viewer.isAdmin
          ? { is_admin: true, pending: await store.countByStatus('open') }
          : { is_admin: false, pending: await store.countByStatus('replied', viewer.id) },
      )
    }

    if (path === '/tickets' && method === 'GET') {
      const scopeAll = url.searchParams.get('scope') === 'all'
      if (scopeAll && !viewer.isAdmin) throw new HttpError(403, t('没有权限', 'Forbidden'))
      const status = url.searchParams.get('status')
      const page = positiveInt(url.searchParams.get('p'), 1, 100000)
      const pageSize = positiveInt(url.searchParams.get('page_size'), 10, 100)
      const keyword = (url.searchParams.get('keyword') ?? '').trim().slice(0, 100)
      const result = await store.listTickets({
        userId: scopeAll ? undefined : viewer.id,
        status: STATUSES.includes(status as TicketStatus) ? (status as TicketStatus) : undefined,
        keyword: scopeAll && keyword ? keyword : undefined,
        page,
        pageSize,
      })
      return ok({ items: result.items.map((ticket) => ticketView(ticket, viewer)), total: result.total, page, page_size: pageSize })
    }

    if (path === '/tickets' && method === 'POST') {
      const body = await readJson(request, t)
      const title = typeof body.title === 'string' ? body.title.trim() : ''
      const category = body.category as TicketCategory
      if (!title) throw new HttpError(400, t('请填写标题', 'Please enter a title'))
      if (title.length > LIMITS.titleMax) throw new HttpError(400, t(`标题最多 ${LIMITS.titleMax} 字`, `Title is limited to ${LIMITS.titleMax} characters`))
      if (!CATEGORIES.includes(category)) throw new HttpError(400, t('请选择问题类型', 'Please choose a category'))
      const { content, imageIds } = parseContent(body, t)
      if (!content) throw new HttpError(400, t('请填写问题描述', 'Please describe the issue'))
      if (!viewer.isAdmin && (await store.countActive(viewer.id)) >= LIMITS.activePerUser) {
        throw new HttpError(429, t('未关闭的工单太多了，请先关闭已解决的工单', 'Too many open tickets — please close resolved ones first'))
      }
      if (!limiter.allow(`create:${viewer.id}`, LIMITS.createPerHour, 3600_000)) {
        throw new HttpError(429, t('提交太频繁了，请稍后再试', 'Too many tickets — please try again later'))
      }
      const ticket = await store.createTicket(
        { id: viewer.id, username: viewer.username, displayName: viewer.displayName, email: viewer.email },
        { title, category, content, imageIds },
      )
      return ok(ticketView(ticket, viewer))
    }

    const detail = path.match(/^\/tickets\/(\d+)$/)
    if (detail && method === 'GET') {
      const ticket = await loadOwnTicket(Number(detail[1]), viewer, t)
      const messages = await store.listMessages(ticket.id)
      return ok({ ticket: ticketView(ticket, viewer), messages: messages.map((message) => messageView(message, viewer)) })
    }

    const reply = path.match(/^\/tickets\/(\d+)\/messages$/)
    if (reply && method === 'POST') {
      const ticket = await loadOwnTicket(Number(reply[1]), viewer, t)
      const body = await readJson(request, t)
      const { content, imageIds } = parseContent(body, t)
      // 管理员回复自己提交的单时也按用户身份算，避免状态错乱
      const isStaff = viewer.isAdmin && ticket.user_id !== viewer.id
      const message = await store.addMessage(ticket.id, { id: viewer.id, name: viewer.displayName || viewer.username, isStaff }, content, imageIds)
      return ok(messageView({ ...message, images: imageIds }, viewer))
    }

    const statusMatch = path.match(/^\/tickets\/(\d+)\/status$/)
    if (statusMatch && method === 'POST') {
      const ticket = await loadOwnTicket(Number(statusMatch[1]), viewer, t)
      const body = await readJson(request, t)
      const next = body.status as TicketStatus
      // 用户只能关单；重新打开靠「继续追问」。管理员可以改成任意状态。
      const allowed = viewer.isAdmin ? STATUSES.includes(next) : next === 'closed'
      if (!allowed) throw new HttpError(400, t('不支持这个操作', 'Unsupported status'))
      await store.setStatus(ticket.id, next)
      return ok(ticketView((await store.getTicket(ticket.id))!, viewer))
    }

    if (path === '/uploads' && method === 'POST') {
      const mb = Math.round((maxImageBytes / 1024 / 1024) * 10) / 10
      if (!limiter.allow(`upload:${viewer.id}`, LIMITS.uploadPerHour, 3600_000)) {
        throw new HttpError(429, t('上传太频繁了，请稍后再试', 'Too many uploads — please try again later'))
      }
      const bytes = await readBody(request, maxImageBytes, t(`图片不能超过 ${mb}MB`, `Images must be ${mb}MB or smaller`))
      const mime = sniffImage(bytes)
      if (!mime) throw new HttpError(400, t('只支持 PNG、JPG、GIF、WebP 图片', 'Only PNG, JPG, GIF and WebP images are supported'))
      const image = await store.saveImage(viewer.id, mime, bytes)
      return ok({ id: image.id, size: image.size, mime: image.mime })
    }

    const image = path.match(/^\/uploads\/([a-f0-9]{32})$/)
    if (image && method === 'GET') {
      const row = await store.getImage(image[1]!)
      const visible = row && (viewer.isAdmin || row.owner_id === viewer.id || row.ticket_user_id === viewer.id)
      const bytes = visible ? await store.readImage(row.id) : null
      if (!row || !bytes) throw new HttpError(404, t('图片不存在', 'Image not found'))
      return new Response(new Uint8Array(bytes), {
        headers: {
          'Content-Type': row.mime,
          'Cache-Control': 'private, max-age=86400, immutable',
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
          'Content-Disposition': 'inline',
        },
      })
    }

    throw new HttpError(404, t('接口不存在', 'Not found'))
  }

  return async function handle(request: Request): Promise<Response> {
    const lang = /^zh/i.test(request.headers.get('accept-language') ?? 'zh') ? 'zh' : 'en'
    const t: T = (zh, en) => (lang === 'zh' ? zh : en)
    try {
      const url = new URL(request.url)
      if (url.pathname === `${PREFIX}/healthz`) return ok({ ok: true })
      if (!url.pathname.startsWith(`${PREFIX}/`)) throw new HttpError(404, t('接口不存在', 'Not found'))

      let viewer: Viewer | null
      try {
        viewer = await auth.resolve(request.headers.get('authorization') ?? undefined)
      } catch {
        throw new HttpError(503, t('暂时无法确认登录状态，请稍后再试', 'Cannot verify your sign-in right now — please try again'))
      }
      if (!viewer) throw new HttpError(401, t('请先登录', 'Please sign in'))

      return await route(request, viewer, url, t)
    } catch (error) {
      if (error instanceof HttpError) return json(error.status, { success: false, message: error.message })
      if (error instanceof ImageNotAvailableError) {
        return json(400, { success: false, message: t('图片已失效，请重新上传', 'An image expired — please upload it again') })
      }
      console.error('[ticket-service]', error)
      return json(500, { success: false, message: t('服务器出错了，请稍后再试', 'Server error — please try again later') })
    }
  }
}
