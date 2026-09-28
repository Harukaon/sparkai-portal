# 工单服务（ticket-service）

SparkAI 的简单工单系统后端：用户填表提交问题（可带截图），管理员在控制台回复。

- **不改 New API**：身份直接问 New API（把前端的登录令牌转给 `/api/user/self`），`role >= 10` 视为管理员。
- **线上跑在 Cloudflare Workers（免费额度）**：工单存 D1（`sparkai-tickets`），截图存 R2（`sparkai-tickets` 桶，`tickets/` 前缀）。
- **本地开发**用 Node 自带 SQLite + 本地文件，同一份业务代码（`src/app.ts`、`src/store.ts`），零第三方依赖。
- 入口：线上 `src/worker.ts`，本地 `src/server.ts`；表结构 `schema.sql` 两边共用。

## 本地运行

```bash
cd ticket-service
node src/server.ts        # 默认 127.0.0.1:3100，数据在 ./data，New API 在 127.0.0.1:3000
```

前台 `pnpm dev` 已把 `/ticket-api` 代理到 3100。测试随前台一起跑：在仓库根目录 `pnpm test`。

## 配置（环境变量）

| 变量 | 默认 | 说明 |
|---|---|---|
| `TICKET_HOST` | `127.0.0.1` | 监听地址 |
| `TICKET_PORT` | `3100` | 端口 |
| `NEW_API_BASE` | `http://127.0.0.1:3000` | New API 地址（服务器之间直连即可） |
| `TICKET_DATA_DIR` | `./data` | 数据库和图片目录 |
| `TICKET_MAX_IMAGE_BYTES` | `1048576` | 单张图片上限（1MB） |

## 接口（都在 `/ticket-api` 下，返回 `{ success, message, data }`）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/summary` | 小红点数字：管理员 = 待处理总数；用户 = 自己「已回复」的单数 |
| GET | `/tickets?p=&page_size=&status=` | 我的工单；管理员加 `scope=all`（可带 `keyword`）看全部 |
| POST | `/tickets` | 新建 `{ title, category, content, images[] }` |
| GET | `/tickets/:id` | 详情 + 对话 |
| POST | `/tickets/:id/messages` | 回复 `{ content, images[] }`；客服回复 → 已回复，用户追问 → 待处理 |
| POST | `/tickets/:id/status` | 改状态；用户只能 `closed`，管理员任意 |
| POST | `/uploads` | 上传图片（请求体就是图片本身），≤1MB，只收 PNG/JPG/GIF/WebP |
| GET | `/uploads/:id` | 看图：上传者、工单主人、管理员可看 |

分类：`topup` 充值 / `billing` 扣费 / `api` 接口报错 / `account` 账号 / `other` 其他。

## 线上部署（Cloudflare）

配置在 `wrangler.toml`：Worker 绑定自己的域名 `ticket.sparkai.si`（走 Cloudflare）。主站 `ai.sparkai.si` 是灰云直连源站，由源站 OpenResty 把 `/ticket-api/` 反代到 `https://ticket.sparkai.si`（`client_max_body_size 2m`），前台地址不变。以后换成 DMIT 等中转机，也是在中转机上加同样一条反代。

```bash
cd ticket-service
# 首次：建库、建桶、建表（database_id 填回 wrangler.toml）
npx wrangler@4 d1 create sparkai-tickets
npx wrangler@4 r2 bucket create sparkai-tickets
npx wrangler@4 d1 execute sparkai-tickets --remote --file schema.sql
# 之后每次发布
npx wrangler@4 deploy
```

免费额度：Workers 每天 10 万次请求；D1 5GB；R2 10GB（下载流量免费）。每小时有一个定时任务清理上传后没发出去的图片。
