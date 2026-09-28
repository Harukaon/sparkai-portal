import fs from 'node:fs'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import os from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createHandler } from '../src/app.ts'
import { Authenticator } from '../src/auth.ts'
import { TicketStore } from '../src/store.ts'

/** 假的 New API：三个令牌分别对应普通用户 A、普通用户 B、管理员 */
const USERS: Record<string, { id: number; username: string; display_name: string; email: string; role: number; status: number }> = {
  'Bearer token-alice': { id: 11, username: 'alice', display_name: 'Alice', email: 'a@x.com', role: 1, status: 1 },
  'Bearer token-bob': { id: 12, username: 'bob', display_name: 'Bob', email: 'b@x.com', role: 1, status: 1 },
  'Bearer token-admin': { id: 1, username: 'root', display_name: 'Root', email: 'r@x.com', role: 100, status: 1 },
  'Bearer token-banned': { id: 13, username: 'eve', display_name: 'Eve', email: 'e@x.com', role: 1, status: 2 },
}

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4a20000000049454e44ae426082', 'hex')

let newApi: http.Server
let service: http.Server
let base = ''
let dataDir = ''
let store: TicketStore

beforeAll(async () => {
  newApi = http.createServer((req, res) => {
    const user = USERS[req.headers.authorization ?? '']
    if (req.url !== '/api/user/self' || !user) {
      res.writeHead(401, { 'Content-Type': 'application/json' }).end(JSON.stringify({ success: false }))
      return
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ success: true, data: user }))
  })
  await new Promise<void>((resolve) => newApi.listen(0, '127.0.0.1', resolve))
  const apiPort = (newApi.address() as AddressInfo).port

  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ticket-test-'))
  store = new TicketStore(dataDir)
  service = http.createServer(
    createHandler({ store, auth: new Authenticator(`http://127.0.0.1:${apiPort}`), maxImageBytes: 1024 * 1024 }),
  )
  await new Promise<void>((resolve) => service.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(service.address() as AddressInfo).port}/ticket-api`
})

afterAll(async () => {
  await new Promise((resolve) => service.close(resolve))
  await new Promise((resolve) => newApi.close(resolve))
  store.close()
  fs.rmSync(dataDir, { recursive: true, force: true })
})

async function call(who: string | null, method: string, url: string, body?: unknown, raw?: Buffer) {
  const headers: Record<string, string> = {}
  if (who) headers.Authorization = `Bearer token-${who}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(`${base}${url}`, {
    method,
    headers,
    body: raw ? new Uint8Array(raw) : body !== undefined ? JSON.stringify(body) : undefined,
  })
  const type = response.headers.get('content-type') ?? ''
  const json = type.includes('json') ? ((await response.json()) as { success: boolean; message: string; data: any }) : null
  return { status: response.status, json, response }
}

describe('登录校验', () => {
  it('没带令牌、令牌无效、账号被封都不行', async () => {
    expect((await call(null, 'GET', '/tickets')).status).toBe(401)
    expect((await call('nobody', 'GET', '/tickets')).status).toBe(401)
    expect((await call('banned', 'GET', '/tickets')).status).toBe(401)
  })
})

describe('完整流程：提交 → 客服回复 → 用户追问 → 关闭', () => {
  let ticketId = 0
  let imageId = ''

  it('上传图片：按文件头识别，伪装的文件和超过 1MB 的都被拒', async () => {
    const good = await call('alice', 'POST', '/uploads', undefined, PNG)
    expect(good.json?.success).toBe(true)
    imageId = good.json?.data.id
    expect(imageId).toMatch(/^[a-f0-9]{32}$/)

    const fake = await call('alice', 'POST', '/uploads', undefined, Buffer.from('<script>alert(1)</script>'))
    expect(fake.status).toBe(400)

    const big = await call('alice', 'POST', '/uploads', undefined, Buffer.concat([PNG, Buffer.alloc(1024 * 1024)]))
    expect(big.status).toBe(413)
  })

  it('用户提交工单，带上图片', async () => {
    const created = await call('alice', 'POST', '/tickets', { title: '充值没到账', category: 'topup', content: '订单号 123', images: [imageId] })
    expect(created.json?.success).toBe(true)
    ticketId = created.json?.data.id
    expect(created.json?.data.status).toBe('open')
    // 普通用户看不到 user 字段
    expect(created.json?.data.user).toBeUndefined()
  })

  it('别人上传的图不能挂到自己的单上', async () => {
    const bobImage = await call('bob', 'POST', '/uploads', undefined, PNG)
    const stolen = await call('alice', 'POST', `/tickets/${ticketId}/messages`, { content: 'x', images: [bobImage.json?.data.id] })
    expect(stolen.status).toBe(400)
  })

  it('别人看不到这张单，也看不到里面的图', async () => {
    expect((await call('bob', 'GET', `/tickets/${ticketId}`)).status).toBe(404)
    expect((await call('bob', 'GET', `/uploads/${imageId}`)).status).toBe(404)
    expect((await call('bob', 'POST', `/tickets/${ticketId}/messages`, { content: 'hi' })).status).toBe(404)
    const list = await call('bob', 'GET', '/tickets')
    expect(list.json?.data.total).toBe(0)
    expect((await call('bob', 'GET', '/tickets?scope=all')).status).toBe(403)
  })

  it('管理员能看到全部工单和提交人，能看图', async () => {
    const all = await call('admin', 'GET', '/tickets?scope=all&status=open')
    expect(all.json?.data.total).toBe(1)
    expect(all.json?.data.items[0].user.username).toBe('alice')
    const img = await call('admin', 'GET', `/uploads/${imageId}`)
    expect(img.status).toBe(200)
    expect(img.response.headers.get('content-type')).toBe('image/png')
    expect((await call('admin', 'GET', '/summary')).json?.data.pending).toBe(1)
  })

  it('客服回复后状态变「已回复」，用户看不到客服账号名', async () => {
    const reply = await call('admin', 'POST', `/tickets/${ticketId}/messages`, { content: '已为您补单' })
    expect(reply.json?.success).toBe(true)
    const detail = await call('alice', 'GET', `/tickets/${ticketId}`)
    expect(detail.json?.data.ticket.status).toBe('replied')
    const staff = detail.json?.data.messages.at(-1)
    expect(staff.is_staff).toBe(true)
    expect(staff.author_name).toBe('')
    expect(detail.json?.data.messages[0].images).toEqual([imageId])
    expect((await call('alice', 'GET', '/summary')).json?.data.pending).toBe(1)
  })

  it('用户追问后回到「待处理」；用户不能把状态改成别的，只能关单', async () => {
    await call('alice', 'POST', `/tickets/${ticketId}/messages`, { content: '收到了，谢谢' })
    expect((await call('alice', 'GET', `/tickets/${ticketId}`)).json?.data.ticket.status).toBe('open')
    expect((await call('alice', 'POST', `/tickets/${ticketId}/status`, { status: 'replied' })).status).toBe(400)
    const closed = await call('alice', 'POST', `/tickets/${ticketId}/status`, { status: 'closed' })
    expect(closed.json?.data.status).toBe('closed')
  })
})

describe('输入校验', () => {
  it('标题、类型、描述都要填，长度有限制', async () => {
    expect((await call('bob', 'POST', '/tickets', { title: '', category: 'api', content: 'x' })).status).toBe(400)
    expect((await call('bob', 'POST', '/tickets', { title: 'x', category: 'nope', content: 'x' })).status).toBe(400)
    expect((await call('bob', 'POST', '/tickets', { title: 'x', category: 'api', content: '' })).status).toBe(400)
    expect((await call('bob', 'POST', '/tickets', { title: 'x'.repeat(101), category: 'api', content: 'x' })).status).toBe(400)
    expect((await call('bob', 'POST', '/tickets', { title: 'x', category: 'api', content: 'x'.repeat(5001) })).status).toBe(400)
  })

  it('错误信息按语言返回', async () => {
    const response = await fetch(`${base}/tickets`, { headers: { 'Accept-Language': 'en' } })
    expect(((await response.json()) as { message: string }).message).toBe('Please sign in')
  })
})
