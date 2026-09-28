import http from 'node:http'

import { createHandler } from './app.ts'
import { Authenticator } from './auth.ts'
import { loadConfig } from './config.ts'
import { TicketStore } from './store.ts'

/** 入口：node src/server.ts（Node 24+ 直接运行 TypeScript，无需编译） */
const config = loadConfig()
const store = new TicketStore(config.dataDir)
const auth = new Authenticator(config.newApiBase)
const server = http.createServer(createHandler({ store, auth, maxImageBytes: config.maxImageBytes }))

server.requestTimeout = 30_000
server.headersTimeout = 15_000

const pruneTimer = setInterval(() => {
  try {
    store.pruneOrphanImages()
  } catch (error) {
    console.error('[ticket-service] prune failed', error)
  }
}, 3600_000)
pruneTimer.unref()

server.listen(config.port, config.host, () => {
  console.log(`[ticket-service] listening on http://${config.host}:${config.port} (data: ${config.dataDir}, new-api: ${config.newApiBase})`)
})

function shutdown(): void {
  server.close(() => {
    store.close()
    process.exit(0)
  })
  setTimeout(() => process.exit(0), 5000).unref()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
