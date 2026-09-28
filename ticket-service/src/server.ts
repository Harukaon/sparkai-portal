import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

import { createHandler } from './app.ts'
import { Authenticator } from './auth.ts'
import { loadConfig } from './config.ts'
import { fsBlobs, nodeDb, toNodeListener } from './node.ts'
import { TicketStore } from './store.ts'

/** 本地开发入口：node src/server.ts（线上跑在 Cloudflare，见 worker.ts） */
const config = loadConfig()
const db = nodeDb(path.join(config.dataDir, 'tickets.db'))
const store = new TicketStore(db, fsBlobs(path.join(config.dataDir, 'uploads')))
await store.migrate(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'))

const auth = new Authenticator(config.newApiBase)
const server = http.createServer(toNodeListener(createHandler({ store, auth, maxImageBytes: config.maxImageBytes })))

setInterval(() => void store.pruneOrphanImages().catch((error: unknown) => console.error('[ticket-service] prune failed', error)), 3600_000).unref()

server.listen(config.port, config.host, () => {
  console.log(`[ticket-service] listening on http://${config.host}:${config.port} (data: ${config.dataDir}, new-api: ${config.newApiBase})`)
})

function shutdown(): void {
  server.close(() => {
    db.close()
    process.exit(0)
  })
  setTimeout(() => process.exit(0), 5000).unref()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
