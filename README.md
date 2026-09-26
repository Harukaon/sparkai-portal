# AI 接口中转站 · 用户前台

面向**用户**的前台站点：讲清楚中转站是什么、支持哪些模型、怎么计费、怎么接入。

技术栈：React 19 + TypeScript + Vite + Ant Design 6 + React Router 7 + TanStack Query + Zustand。

---

## 快速开始

```bash
pnpm install
pnpm dev          # http://localhost:5273
```

其他命令：

```bash
pnpm build        # 生产构建（先类型检查再打包）
pnpm verify       # 提交前跑这个：类型检查 + lint + 单测
pnpm test         # 只跑单测
pnpm format       # 格式化全部代码
```

---

## 目录结构

```
src/
├── app/                应用装配层：Provider、路由、页头页脚、导航配置
│   ├── App.tsx         根组件
│   ├── providers.tsx   全局 Provider 汇总（主题 / 消息 / 数据缓存）
│   ├── router.tsx      路由表
│   ├── nav.ts          导航与页脚链接配置（加菜单改这里）
│   └── layout/         站点骨架：SiteLayout / SiteHeader / SiteFooter
│
├── pages/              页面装配层：只负责把各区块拼起来
│   ├── landing/HomePage.tsx
│   └── NotFoundPage.tsx
│
├── features/           业务功能层：一块业务一个目录，自带组件 / 数据 / 逻辑
│   └── landing/        落地页
│       ├── components/ 各区块组件（首屏 / 卖点 / 模型表 / 价格 / 步骤 / 行动区）
│       ├── data.ts     ⚠️ 当前是示例数据，接口就绪后换成接口查询
│       ├── types.ts    业务数据结构
│       └── billing.ts  计费算法（纯函数，有单测）
│
├── shared/             跨业务复用层
│   ├── api/            请求层：client.ts（axios 实例）/ query-client.ts
│   ├── components/     Section（分区外壳）/ CopyField（可复制信息行）
│   ├── hooks/          usePageTitle 等
│   └── lib/            env（环境变量唯一读取口）/ format（格式化工具，有单测）
│
└── styles/             样式基础层
    ├── tokens.css      ⭐ 设计令牌：颜色 / 字号 / 间距的唯一真源
    ├── global.css      重置与全局约定
    └── antd-theme.ts   Ant Design 主题（色值需与 tokens.css 保持一致）
```

### 分层规则（硬性）

| 层          | 允许                         | 禁止                                                   |
| ----------- | ---------------------------- | ------------------------------------------------------ |
| `pages/`    | 拼装区块、传数据             | 写业务逻辑、直接发请求                                 |
| `features/` | 该业务的组件、数据获取、算法 | 被别的 feature 直接 import（要复用就下沉到 `shared/`） |
| `shared/`   | 与业务无关的通用能力         | 出现任何具体业务概念                                   |
| `styles/`   | 令牌、全局样式、主题         | 出现具体组件样式                                       |

依赖方向单向：`app → pages → features → shared → styles`。

- 组件样式一律用 `模块名.module.css`，不写全局类名（`container` 除外）。
- 所有颜色 / 字号 / 间距走 `var(--xxx)`，**不要写死色值**。

---

## 配色：暖白 + 近黑 + 琥珀金

| 角色           | 色值      | 变量                      |
| -------------- | --------- | ------------------------- |
| 页面底色       | `#FBF9F5` | `--color-canvas`          |
| 卡片           | `#FFFFFF` | `--color-surface`         |
| 文字           | `#16150F` | `--color-ink`             |
| 次要文字       | `#6B6862` | `--color-ink-muted`       |
| 分隔线         | `#EAE5DA` | `--color-line`            |
| 主色（琥珀金） | `#E8A317` | `--color-accent`          |
| 主色浅底       | `#FDF3DC` | `--color-accent-soft`     |
| 深色块         | `#14120C` | `--color-surface-inverse` |

三条规则，改配色时请一起遵守：

1. **底色用暖白，不用纯白** —— 纯白配近黑对比过硬，长时间看眼睛累；
2. **文字用近黑，不用纯黑** —— 纯黑在屏幕上生硬、有压迫感；
3. **黄色只做点睛**（按钮、选中、重点数字、强调线），不做大面积背景，
   **也不要黄底配白字** —— 那样对比度只有约 2.2:1，读不清。主按钮是黄底 + 深色字。

改颜色只改 `src/styles/tokens.css`，然后同步 `src/styles/antd-theme.ts` 里对应的值。

---

## 接后端接口

现在页面数据来自 `src/features/landing/data.ts` 的示例常量。接真实接口时：

1. 在 `src/features/landing/` 下新建 `api.ts`，用 `http`（`src/shared/api/client.ts`）写请求函数；
2. 用 TanStack Query 包一层 hook，例如 `useModels()`；
3. 把 `HomePage.tsx` 里 import 的常量换成该 hook 的返回值。

组件与样式不需要改动 —— 数据结构见 `features/landing/types.ts`。

环境变量：

- `VITE_API_BASE_URL`：接口基地址。留空表示走同域 `/api/**`（开发由 vite 代理，生产由网关转发）。
- 本地开发时后端跑在别处，改 `.env.local` 的 `VITE_PROXY_TARGET`（默认 `http://127.0.0.1:8787`）。

---

## 待办（下一步确认后再做）

- [ ] 真实域名替换：`features/landing/data.ts` 里的 `api.your-domain.com` 全是占位
- [ ] 模型清单、价格改为接口数据（目前是示例）
- [ ] 注册 / 登录 / 创建密钥：现在点了只弹提示
- [ ] 接口文档页、服务状态页（页脚链接目前指向首页锚点）
- [ ] 控制台（用户中心）：密钥管理、用量看板、账单
