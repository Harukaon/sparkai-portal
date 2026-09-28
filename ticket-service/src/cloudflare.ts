import type { Blobs, Db, RunResult, SqlValue, Statement } from './db.ts'

/**
 * Cloudflare D1 / R2 的适配。这里只声明用到的那几个方法，
 * 省得为了类型再装 @cloudflare/workers-types。
 */
interface D1Result<T> {
  results?: T[]
  meta: { changes?: number; last_row_id?: number }
}
interface D1PreparedStatement {
  bind(...values: SqlValue[]): D1PreparedStatement
  all<T>(): Promise<D1Result<T>>
  first<T>(): Promise<T | null>
  run(): Promise<D1Result<unknown>>
}
export interface D1Database {
  prepare(sql: string): D1PreparedStatement
  batch(statements: D1PreparedStatement[]): Promise<D1Result<unknown>[]>
}

interface R2Object {
  arrayBuffer(): Promise<ArrayBuffer>
  httpMetadata?: { contentType?: string }
}
export interface R2Bucket {
  put(key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>
  get(key: string): Promise<R2Object | null>
  delete(key: string): Promise<void>
}

function toRun(result: D1Result<unknown>): RunResult {
  return { changes: result.meta.changes ?? 0, lastRowId: result.meta.last_row_id ?? 0 }
}

export function d1Db(db: D1Database): Db {
  const prepare = (sql: string, params: SqlValue[] = []) => db.prepare(sql).bind(...params)
  return {
    async all<T>(sql: string, params?: SqlValue[]) {
      return ((await prepare(sql, params).all<T>()).results ?? []) as T[]
    },
    async first<T>(sql: string, params?: SqlValue[]) {
      return ((await prepare(sql, params).first<T>()) ?? undefined) as T | undefined
    },
    async run(sql, params) {
      return toRun(await prepare(sql, params).run())
    },
    async batch(statements: Statement[]) {
      const results = await db.batch(statements.map((statement) => prepare(statement.sql, statement.params)))
      return results.map(toRun)
    },
  }
}

export function r2Blobs(bucket: R2Bucket): Blobs {
  return {
    async put(id, bytes, mime) {
      await bucket.put(`tickets/${id}`, bytes, { httpMetadata: { contentType: mime } })
    },
    async get(id) {
      const object = await bucket.get(`tickets/${id}`)
      if (!object) return null
      return { bytes: new Uint8Array(await object.arrayBuffer()), mime: object.httpMetadata?.contentType ?? 'application/octet-stream' }
    },
    async delete(id) {
      await bucket.delete(`tickets/${id}`)
    },
  }
}
