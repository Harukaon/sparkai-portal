import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import type { ImageMime } from './images.ts'

/**
 * 工单数据：一张 SQLite 表存工单，一张存对话，一张存图片登记（图片文件本身放磁盘）。
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

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tickets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  username      TEXT    NOT NULL DEFAULT '',
  display_name  TEXT    NOT NULL DEFAULT '',
  email         TEXT    NOT NULL DEFAULT '',
  title         TEXT    NOT NULL,
  category      TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'open',
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id    INTEGER NOT NULL REFERENCES tickets(id),
  author_id    INTEGER NOT NULL,
  author_name  TEXT    NOT NULL DEFAULT '',
  is_staff     INTEGER NOT NULL DEFAULT 0,
  content      TEXT    NOT NULL,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_ticket ON messages(ticket_id, id);

CREATE TABLE IF NOT EXISTS images (
  id          TEXT    PRIMARY KEY,
  owner_id    INTEGER NOT NULL,
  message_id  INTEGER REFERENCES messages(id),
  mime        TEXT    NOT NULL,
  size        INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_images_message ON images(message_id);
`

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

export class TicketStore {
  private readonly db: DatabaseSync
  private readonly uploadDir: string

  constructor(dataDir: string) {
    fs.mkdirSync(dataDir, { recursive: true })
    this.uploadDir = path.join(dataDir, 'uploads')
    fs.mkdirSync(this.uploadDir, { recursive: true })
    this.db = new DatabaseSync(path.join(dataDir, 'tickets.db'))
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')
    this.db.exec(SCHEMA)
  }

  close(): void {
    this.db.close()
  }

  private transaction<T>(work: () => T): T {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const result = work()
      this.db.exec('COMMIT')
      return result
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  // ---------- 工单 ----------

  createTicket(
    owner: { id: number; username: string; displayName: string; email: string },
    input: { title: string; category: TicketCategory; content: string; imageIds: string[] },
  ): TicketRow {
    const id = this.transaction(() => {
      const time = nowSeconds()
      const result = this.db
        .prepare(
          `INSERT INTO tickets (user_id, username, display_name, email, title, category, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
        )
        .run(owner.id, owner.username, owner.displayName, owner.email, input.title, input.category, time, time)
      const ticketId = Number(result.lastInsertRowid)
      this.insertMessage(ticketId, { id: owner.id, name: owner.displayName || owner.username, isStaff: false }, input.content, input.imageIds, time)
      return ticketId
    })
    return this.getTicket(id)!
  }

  getTicket(id: number): TicketRow | undefined {
    return this.db
      .prepare(
        `SELECT t.*, (SELECT COUNT(*) FROM messages m WHERE m.ticket_id = t.id) AS message_count
         FROM tickets t WHERE t.id = ?`,
      )
      .get(id) as TicketRow | undefined
  }

  listTickets(query: ListQuery): { items: TicketRow[]; total: number } {
    const where: string[] = []
    const params: (string | number)[] = []
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
    const total = (this.db.prepare(`SELECT COUNT(*) AS n FROM tickets t ${clause}`).get(...params) as { n: number }).n
    const items = this.db
      .prepare(
        `SELECT t.*, (SELECT COUNT(*) FROM messages m WHERE m.ticket_id = t.id) AS message_count
         FROM tickets t ${clause}
         ORDER BY t.updated_at DESC, t.id DESC
         LIMIT ? OFFSET ?`,
      )
      .all(...params, query.pageSize, (query.page - 1) * query.pageSize) as unknown as TicketRow[]
    return { items, total }
  }

  /** 用户还没关掉的工单数，用来限制一个人同时挂太多单 */
  countActive(userId: number): number {
    return (this.db.prepare(`SELECT COUNT(*) AS n FROM tickets WHERE user_id = ? AND status != 'closed'`).get(userId) as { n: number }).n
  }

  countByStatus(status: TicketStatus, userId?: number): number {
    const row =
      userId === undefined
        ? this.db.prepare('SELECT COUNT(*) AS n FROM tickets WHERE status = ?').get(status)
        : this.db.prepare('SELECT COUNT(*) AS n FROM tickets WHERE status = ? AND user_id = ?').get(status, userId)
    return (row as { n: number }).n
  }

  setStatus(id: number, status: TicketStatus): void {
    this.db.prepare('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?').run(status, nowSeconds(), id)
  }

  // ---------- 对话 ----------

  private insertMessage(ticketId: number, author: Author, content: string, imageIds: string[], time: number): number {
    const result = this.db
      .prepare(
        `INSERT INTO messages (ticket_id, author_id, author_name, is_staff, content, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(ticketId, author.id, author.name, author.isStaff ? 1 : 0, content, time)
    const messageId = Number(result.lastInsertRowid)
    const attach = this.db.prepare('UPDATE images SET message_id = ? WHERE id = ? AND owner_id = ? AND message_id IS NULL')
    for (const imageId of imageIds) {
      const changed = attach.run(messageId, imageId, author.id).changes
      if (Number(changed) !== 1) throw new ImageNotAvailableError(imageId)
    }
    return messageId
  }

  /** 追加一条回复，并按「谁回复的」更新工单状态 */
  addMessage(ticketId: number, author: Author, content: string, imageIds: string[]): MessageRow {
    const messageId = this.transaction(() => {
      const time = nowSeconds()
      const id = this.insertMessage(ticketId, author, content, imageIds, time)
      this.db.prepare('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?').run(author.isStaff ? 'replied' : 'open', time, ticketId)
      return id
    })
    return this.db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as unknown as MessageRow
  }

  listMessages(ticketId: number): (MessageRow & { images: string[] })[] {
    const messages = this.db.prepare('SELECT * FROM messages WHERE ticket_id = ? ORDER BY id').all(ticketId) as unknown as MessageRow[]
    const images = this.db
      .prepare(
        `SELECT i.id, i.message_id FROM images i JOIN messages m ON m.id = i.message_id
         WHERE m.ticket_id = ? ORDER BY i.created_at, i.id`,
      )
      .all(ticketId) as { id: string; message_id: number }[]
    return messages.map((message) => ({
      ...message,
      images: images.filter((image) => image.message_id === message.id).map((image) => image.id),
    }))
  }

  // ---------- 图片 ----------

  saveImage(ownerId: number, mime: ImageMime, bytes: Uint8Array): ImageRow {
    const id = randomBytes(16).toString('hex')
    fs.writeFileSync(path.join(this.uploadDir, id), bytes, { mode: 0o600 })
    const row: ImageRow = { id, owner_id: ownerId, message_id: null, mime, size: bytes.length, created_at: nowSeconds() }
    this.db
      .prepare('INSERT INTO images (id, owner_id, message_id, mime, size, created_at) VALUES (?, ?, NULL, ?, ?, ?)')
      .run(row.id, row.owner_id, row.mime, row.size, row.created_at)
    return row
  }

  getImage(id: string): (ImageRow & { ticket_user_id: number | null }) | undefined {
    if (!/^[a-f0-9]{32}$/.test(id)) return undefined
    return this.db
      .prepare(
        `SELECT i.*, t.user_id AS ticket_user_id FROM images i
         LEFT JOIN messages m ON m.id = i.message_id
         LEFT JOIN tickets t ON t.id = m.ticket_id
         WHERE i.id = ?`,
      )
      .get(id) as (ImageRow & { ticket_user_id: number | null }) | undefined
  }

  readImage(id: string): Buffer {
    return fs.readFileSync(path.join(this.uploadDir, id))
  }

  /** 传了却一直没发出去的图片（比如用户上传后关了页面），超过一天就清掉 */
  pruneOrphanImages(olderThanSeconds = 24 * 3600): number {
    const cutoff = nowSeconds() - olderThanSeconds
    const rows = this.db.prepare('SELECT id FROM images WHERE message_id IS NULL AND created_at < ?').all(cutoff) as { id: string }[]
    for (const row of rows) {
      fs.rmSync(path.join(this.uploadDir, row.id), { force: true })
      this.db.prepare('DELETE FROM images WHERE id = ?').run(row.id)
    }
    return rows.length
  }
}

export class ImageNotAvailableError extends Error {
  constructor(imageId: string) {
    super(`image ${imageId} is not available`)
    this.name = 'ImageNotAvailableError'
  }
}
