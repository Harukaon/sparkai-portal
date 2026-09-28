import path from 'node:path'

/** 所有配置都走环境变量，缺省值就是本地开发能直接跑的值 */
export interface Config {
  host: string
  port: number
  /** New API 地址：只用来问「这个令牌是谁、是不是管理员」 */
  newApiBase: string
  /** 数据目录：SQLite 文件和图片都放这里，部署时挂到持久化目录 */
  dataDir: string
  /** 单张图片上限，默认 1MB */
  maxImageBytes: number
}

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    host: env.TICKET_HOST ?? '127.0.0.1',
    port: num(env.TICKET_PORT, 3100),
    newApiBase: (env.NEW_API_BASE ?? 'http://127.0.0.1:3000').replace(/\/+$/, ''),
    dataDir: path.resolve(env.TICKET_DATA_DIR ?? 'data'),
    maxImageBytes: num(env.TICKET_MAX_IMAGE_BYTES, 1024 * 1024),
  }
}
