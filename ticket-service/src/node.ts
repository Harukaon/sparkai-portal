import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import type { Blobs, Db, RunResult, SqlValue } from './db.ts'

/** 本地开发 / 测试：Node 自带 SQLite */
export function nodeDb(file: string): Db & { close(): void } {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')
  const run = (sql: string, params: SqlValue[] = []): RunResult => {
    const result = db.prepare(sql).run(...params)
    return { changes: Number(result.changes), lastRowId: Number(result.lastInsertRowid) }
  }
  return {
    async all<T>(sql: string, params: SqlValue[] = []) {
      return db.prepare(sql).all(...params) as T[]
    },
    async first<T>(sql: string, params: SqlValue[] = []) {
      return db.prepare(sql).get(...params) as T | undefined
    },
    async run(sql, params) {
      return run(sql, params)
    },
    async batch(statements) {
      db.exec('BEGIN IMMEDIATE')
      try {
        const results = statements.map((statement) => run(statement.sql, statement.params))
        db.exec('COMMIT')
        return results
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },
    close() {
      db.close()
    },
  }
}

/** 本地开发 / 测试：图片放本地文件夹 */
export function fsBlobs(dir: string): Blobs {
  fs.mkdirSync(dir, { recursive: true })
  const safe = (id: string) => path.join(dir, id.replace(/[^a-f0-9]/g, ''))
  return {
    async put(id, bytes, mime) {
      fs.writeFileSync(safe(id), bytes, { mode: 0o600 })
      fs.writeFileSync(`${safe(id)}.type`, mime)
    },
    async get(id) {
      if (!fs.existsSync(safe(id))) return null
      return { bytes: fs.readFileSync(safe(id)), mime: fs.readFileSync(`${safe(id)}.type`, 'utf8') }
    },
    async delete(id) {
      fs.rmSync(safe(id), { force: true })
      fs.rmSync(`${safe(id)}.type`, { force: true })
    },
  }
}

/** 把 fetch 风格的处理函数挂到 Node 的 http 服务器上 */
export function toNodeListener(handler: (request: Request) => Promise<Response>) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const headers = new Headers()
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') headers.set(key, value)
        else if (Array.isArray(value)) headers.set(key, value.join(', '))
      }
      // 本地桥接：先把请求体整个读进来（上限 10MB，真正的大小限制由业务层判断），省去流式转换的麻烦
      const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
      let body: Uint8Array<ArrayBuffer> | undefined
      if (hasBody) {
        const chunks: Buffer[] = []
        let size = 0
        for await (const chunk of req) {
          size += (chunk as Buffer).length
          if (size <= 10 * 1024 * 1024) chunks.push(chunk as Buffer)
        }
        body = new Uint8Array(Buffer.concat(chunks))
      }
      const request = new Request(`http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`, { method: req.method, headers, body })
      const response = await handler(request)
      const outHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        outHeaders[key] = value
      })
      res.writeHead(response.status, outHeaders)
      res.end(Buffer.from(await response.arrayBuffer()))
    } catch (error) {
      console.error('[ticket-service]', error)
      if (!res.headersSent) res.writeHead(500)
      res.end()
    }
  }
}
