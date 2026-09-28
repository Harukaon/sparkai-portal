import type { Blobs, Db, SqlValue } from './db.ts'
import type { ImageMime } from './images.ts'

/**
 * 工单数据：tickets 存工单，messages 存对话，images 登记图片（图片本身在 Blobs 里）。
 *
 * 状态只有三种：
 * - open     待处理（用户新提交 / 用户追问后）
 * - replied  已回复（客服回复后，等用户看）
 * - closed   已关闭
 */
export const STATUSES = ['open', 'replied', 'closed'] as const
export type TicketStatus = (typeof STATUSES)[number]

export const CATEGORIES = ['topup', 'billing', 'api', 'account', 'other'] as const
export type TicketCategory = (typeof CATEGORIES)[number]

export interface TicketRow {
  id: number
  user_id: number
  username: string
  display_name: string
  email: string
  title: string
  category: TicketCategory
  status: TicketStatus
  created_at: number
  updated_at: number
  message_count: number
}

export interface MessageRow {
  id: number
  ticket_id: number
  author_id: number
  author_name: string
  is_staff: number
  content: string
  created_at: number
}

export interface ImageRow {
  id: string
  owner_id: number
  message_id: number | null
  mime: ImageMime
  size: number
  created_at: number
}

export interface Author {
  id: number
  name: string
  isStaff: boolean
}

export interface ListQuery {
  /** 不传就是查全部（管理员用） */
  userId?: number
  status?: TicketStatus
  keyword?: string
  page: number
  pageSize: number
}

export class ImageNotAvailableError extends Error {
  constructor() {
    super('image is not available')
    this.name = 'ImageNotAvailableError'
  }
}

const TICKET_SELECT = `SELECT t.*, (SELECT COUNT(*) FROM messages m WHERE m.ticket_id = t.id) AS message_count FROM tickets t`

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

function randomId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export class TicketStore {
  private readonly db: Db
  private readonly blobs: Blobs

  constructor(db: Db, blobs: Blobs) {
    this.db = db
    this.blobs = blobs
  }

  /** 建表（幂等）。线上 D1 用 schema.sql 建，本地启动时调用这个 */
  async migrate(schemaSql: string): Promise<void> {
    const statements = schemaSql
      .split(';')
      .map((sql) => sql.replace(/--.*$/gm, '').trim())
      .filter(Boolean)
    for (const sql of statements) await this.db.run(sql)
  }

  /** 先确认这些图都是本人刚上传、还没挂到别的消息上的 */
  private async assertImagesUsable(ownerId: number, imageIds: string[]): Promise<void> {
    if (imageIds.length === 0) return
    const marks = imageIds.map(() => '?').join(',')
    const row = await this.db.first<{ n: number }>(
      `SELECT COUNT(*) AS n FROM images WHERE id IN (${marks}) AND owner_id = ? AND message_id IS NULL`,
      [...imageIds, ownerId],
    )
    if ((row?.n ?? 0) !== imageIds.length) throw new ImageNotAvailableError()
  }

  /** 把刚插入的那条消息（last_insert_rowid）和图片关联起来 */
  private attachImages(ownerId: number, imageIds: string[]) {
    if (imageIds.length === 0) return []
    const marks = imageIds.map(() => '?').join(',')
    return [
      {
        sql: `UPDATE images SET message_id = last_insert_rowid() WHERE id IN (${marks}) AND owner_id = ? AND message_id IS NULL`,
        params: [...imageIds, ownerId] as SqlValue[],
      },
    ]
  }

  // ---------- 工单 ----------

  async createTicket(
    owner: { id: number; username: string; displayName: string; email: string },
    input: { title: string; category: TicketCategory; content: string; imageIds: string[] },
  ): Promise<TicketRow> {
    await this.assertImagesUsable(owner.id, input.imageIds)
    const time = nowSeconds()
    const results = await this.db.batch([
      {
        sql: `INSERT INTO tickets (user_id, username, display_name, email, title, category, status, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
        params: [owner.id, owner.username, owner.displayName, owner.email, input.title, input.category, time, time],
      },
      {
        sql: `INSERT INTO messages (ticket_id, author_id, author_name, is_staff, content, created_at)
              VALUES (last_insert_rowid(), ?, ?, 0, ?, ?)`,
        params: [owner.id, owner.displayName || owner.username, input.content, time],
      },
      ...this.attachImages(owner.id, input.imageIds),
    ])
    return (await this.getTicket(results[0]!.lastRowId))!
  }

  getTicket(id: number): Promise<TicketRow | undefined> {
    return this.db.first<TicketRow>(`${TICKET_SELECT} WHERE t.id = ?`, [id])
  }

  async listTickets(query: ListQuery): Promise<{ items: TicketRow[]; total: number }> {
    const where: string[] = []
    const params: SqlValue[] = []
    if (query.userId !== undefined) {
      where.push('t.user_id = ?')
      params.push(query.userId)
    }
    if (query.status) {
      where.push('t.status = ?')
      params.push(query.status)
    }
    if (query.keyword) {
      const like = `%${query.keyword.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
      where.push(`(t.title LIKE ? ESCAPE '\\' OR t.username LIKE ? ESCAPE '\\' OR t.email LIKE ? ESCAPE '\\' OR CAST(t.id AS TEXT) = ?)`)
      params.push(like, like, like, query.keyword)
    }
    const clause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
    const total = (await this.db.first<{ n: number }>(`SELECT COUNT(*) AS n FROM tickets t ${clause}`, params))?.n ?? 0
    const items = await this.db.all<TicketRow>(
      `${TICKET_SELECT} ${clause} ORDER BY t.updated_at DESC, t.id DESC LIMIT ? OFFSET ?`,
      [...params, query.pageSize, (query.page - 1) * query.pageSize],
    )
    return { items, total }
  }

  /** 用户还没关掉的工单数，用来限制一个人同时挂太多单 */
  async countActive(userId: number): Promise<number> {
    return (await this.db.first<{ n: number }>(`SELECT COUNT(*) AS n FROM tickets WHERE user_id = ? AND status != 'closed'`, [userId]))?.n ?? 0
  }

  async countByStatus(status: TicketStatus, userId?: number): Promise<number> {
    const row =
      userId === undefined
        ? await this.db.first<{ n: number }>('SELECT COUNT(*) AS n FROM tickets WHERE status = ?', [status])
        : await this.db.first<{ n: number }>('SELECT COUNT(*) AS n FROM tickets WHERE status = ? AND user_id = ?', [status, userId])
    return row?.n ?? 0
  }

  async setStatus(id: number, status: TicketStatus): Promise<void> {
    await this.db.run('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?', [status, nowSeconds(), id])
  }

  // ---------- 对话 ----------

  /** 追加一条回复，并按「谁回复的」更新工单状态 */
  async addMessage(ticketId: number, author: Author, content: string, imageIds: string[]): Promise<MessageRow> {
    await this.assertImagesUsable(author.id, imageIds)
    const time = nowSeconds()
    const results = await this.db.batch([
      {
        sql: `INSERT INTO messages (ticket_id, author_id, author_name, is_staff, content, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        params: [ticketId, author.id, author.name, author.isStaff ? 1 : 0, content, time],
      },
      ...this.attachImages(author.id, imageIds),
      { sql: 'UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?', params: [author.isStaff ? 'replied' : 'open', time, ticketId] },
    ])
    return (await this.db.first<MessageRow>('SELECT * FROM messages WHERE id = ?', [results[0]!.lastRowId]))!
  }

  async listMessages(ticketId: number): Promise<(MessageRow & { images: string[] })[]> {
    const messages = await this.db.all<MessageRow>('SELECT * FROM messages WHERE ticket_id = ? ORDER BY id', [ticketId])
    const images = await this.db.all<{ id: string; message_id: number }>(
      `SELECT i.id, i.message_id FROM images i JOIN messages m ON m.id = i.message_id
       WHERE m.ticket_id = ? ORDER BY i.created_at, i.id`,
      [ticketId],
    )
    return messages.map((message) => ({
      ...message,
      images: images.filter((image) => image.message_id === message.id).map((image) => image.id),
    }))
  }

  // ---------- 图片 ----------

  async saveImage(ownerId: number, mime: ImageMime, bytes: Uint8Array): Promise<ImageRow> {
    const row: ImageRow = { id: randomId(), owner_id: ownerId, message_id: null, mime, size: bytes.length, created_at: nowSeconds() }
    await this.blobs.put(row.id, bytes, mime)
    await this.db.run('INSERT INTO images (id, owner_id, message_id, mime, size, created_at) VALUES (?, ?, NULL, ?, ?, ?)', [
      row.id, row.owner_id, row.mime, row.size, row.created_at,
    ])
    return row
  }

  getImage(id: string): Promise<(ImageRow & { ticket_user_id: number | null }) | undefined> {
    if (!/^[a-f0-9]{32}$/.test(id)) return Promise.resolve(undefined)
    return this.db.first(
      `SELECT i.*, t.user_id AS ticket_user_id FROM images i
       LEFT JOIN messages m ON m.id = i.message_id
       LEFT JOIN tickets t ON t.id = m.ticket_id
       WHERE i.id = ?`,
      [id],
    )
  }

  async readImage(id: string): Promise<Uint8Array | null> {
    return (await this.blobs.get(id))?.bytes ?? null
  }

  /** 传了却一直没发出去的图片（比如上传后关了页面），超过一天就清掉 */
  async pruneOrphanImages(olderThanSeconds = 24 * 3600): Promise<number> {
    const cutoff = nowSeconds() - olderThanSeconds
    const rows = await this.db.all<{ id: string }>('SELECT id FROM images WHERE message_id IS NULL AND created_at < ? LIMIT 500', [cutoff])
    for (const row of rows) {
      await this.blobs.delete(row.id)
      await this.db.run('DELETE FROM images WHERE id = ?', [row.id])
    }
    return rows.length
  }
}
