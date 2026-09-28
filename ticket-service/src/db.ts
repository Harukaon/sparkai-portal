/**
 * 数据库和图片存储的最小抽象：线上用 Cloudflare D1 + R2，本地开发和测试用 Node 自带 SQLite + 本地文件。
 * 业务代码只认这两个接口，不关心底下是哪一种。
 */
export type SqlValue = string | number | null

export interface Statement {
  sql: string
  params?: SqlValue[]
}

export interface RunResult {
  changes: number
  lastRowId: number
}

export interface Db {
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>
  first<T>(sql: string, params?: SqlValue[]): Promise<T | undefined>
  run(sql: string, params?: SqlValue[]): Promise<RunResult>
  /** 多条语句放在一个事务里按顺序执行，任何一条出错整批回滚 */
  batch(statements: Statement[]): Promise<RunResult[]>
}

export interface StoredBlob {
  bytes: Uint8Array
  mime: string
}

export interface Blobs {
  put(id: string, bytes: Uint8Array, mime: string): Promise<void>
  get(id: string): Promise<StoredBlob | null>
  delete(id: string): Promise<void>
}
