import { createHandler } from './app.ts'
import { Authenticator } from './auth.ts'
import { d1Db, r2Blobs } from './cloudflare.ts'
import type { D1Database, R2Bucket } from './cloudflare.ts'
import { TicketStore } from './store.ts'

/**
 * Cloudflare Workers 入口。
 * 路由规则把 ai.sparkai.si/ticket-api/* 交给这里，其余请求照常走源站。
 */
interface Env {
  DB: D1Database
  UPLOADS: R2Bucket
  /** New API 地址，用来确认登录身份 */
  NEW_API_BASE: string
  MAX_IMAGE_BYTES?: string
}

let cached: { env: Env; handle: (request: Request) => Promise<Response>; store: TicketStore } | null = null

function setup(env: Env) {
  if (cached?.env !== env) {
    const store = new TicketStore(d1Db(env.DB), r2Blobs(env.UPLOADS))
    const auth = new Authenticator(env.NEW_API_BASE.replace(/\/+$/, ''))
    const maxImageBytes = Number(env.MAX_IMAGE_BYTES) > 0 ? Number(env.MAX_IMAGE_BYTES) : 1024 * 1024
    cached = { env, store, handle: createHandler({ store, auth, maxImageBytes }) }
  }
  return cached
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return setup(env).handle(request)
  },
  /** 定时任务：每小时清一次上传了却没发出去的图片 */
  async scheduled(_controller: unknown, env: Env): Promise<void> {
    await setup(env).store.pruneOrphanImages()
  },
}
