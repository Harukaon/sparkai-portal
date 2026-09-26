import type { AccessStep, BillingExample, EndpointItem, ModelGroup } from '@/features/landing/types'

/*
 * ⚠️ 本文件目前是示例数据（mock），用于把界面搭出来。
 * 等后端接口就绪后，把这里的常量换成 `useQuery` 拉取的接口数据即可，
 * 组件与样式不需要改动（结构见 types.ts）。
 */

/** 能做什么：一行一条，标题短、说明具体 */
export const CAPABILITIES = [
  {
    title: '协议零改动',
    detail: '兼容 OpenAI 与 Anthropic 两套协议，现有 SDK 只需换 base_url，业务代码一行不动。',
  },
  {
    title: '一个密钥用全部模型',
    detail: '不用为每个厂商单独注册、单独充值、单独记账，一套密钥覆盖全部模型。',
  },
  {
    title: '线路自动切换',
    detail: '单个上游异常时自动换线重试，请求不会因为某条链路抖动而直接失败。',
  },
  {
    title: '用量看得见',
    detail: '每次请求的 token、费用、耗时都有明细，账单可以逐笔核对。',
  },
] as const

/** 支持模型（示例数据） */
export const MODEL_GROUPS: ModelGroup[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      {
        id: 'gpt-5.1',
        name: 'GPT-5.1',
        contextWindow: 400000,
        endpoint: 'openai',
        tag: '综合强',
      },
      {
        id: 'gpt-5.1-mini',
        name: 'GPT-5.1 mini',
        contextWindow: 400000,
        endpoint: 'openai',
        tag: '便宜快',
      },
      {
        id: 'gpt-5.1-codex',
        name: 'GPT-5.1 Codex',
        contextWindow: 400000,
        endpoint: 'openai',
        tag: '写代码',
      },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      {
        id: 'claude-sonnet-4-5',
        name: 'Claude Sonnet 4.5',
        contextWindow: 200000,
        endpoint: 'anthropic',
        tag: '综合强',
      },
      {
        id: 'claude-haiku-4-5',
        name: 'Claude Haiku 4.5',
        contextWindow: 200000,
        endpoint: 'anthropic',
        tag: '便宜快',
      },
    ],
  },
  {
    id: 'others',
    name: '其他',
    models: [
      {
        id: 'deepseek-v3.2',
        name: 'DeepSeek V3.2',
        contextWindow: 128000,
        endpoint: 'openai',
        tag: '性价比',
      },
      {
        id: 'kimi-k2',
        name: 'Kimi K2',
        contextWindow: 256000,
        endpoint: 'openai',
      },
      {
        id: 'glm-4.6',
        name: 'GLM-4.6',
        contextWindow: 200000,
        endpoint: 'openai',
      },
      {
        id: 'qwen3-max',
        name: 'Qwen3 Max',
        contextWindow: 256000,
        endpoint: 'openai',
      },
    ],
  },
]

/** 计费规则 */
export const PRICING_RULES = [
  '只按用量计费，没有月费、没有最低消费。',
  '输入（提问）与输出（回答）分别计价，价格按百万 token 计算。',
  '请求失败、上游报错时不扣费。',
  '余额不过期，用不完一直留着。',
] as const

/** 一次真实请求的花费怎么算（示例数字） */
export const BILLING_EXAMPLE: BillingExample = {
  model: 'GPT-5.1',
  inputTokens: 12000,
  outputTokens: 800,
  inputPrice: 1.25,
  outputPrice: 10,
}

/** 接入步骤 */
export const ACCESS_STEPS: AccessStep[] = [
  {
    title: '创建密钥',
    description: '在控制台点一下就能生成，密钥形如 sk-xxxx，可随时吊销重发。',
  },
  {
    title: '改一行地址',
    description: '把客户端的 base_url 换成下面的接入地址，密钥填刚生成的，其余保持原样。',
  },
  {
    title: '发一个请求',
    description: '用官方 SDK 或 curl 都能直接跑通，返回结构与官方完全一致。',
    code: `curl https://api.your-domain.com/v1/chat/completions \\
  -H "Authorization: Bearer $RELAY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-5.1","messages":[{"role":"user","content":"你好"}]}'`,
  },
]

/** 接入地址（示例域名，上线前替换成真实域名） */
export const ENDPOINTS: EndpointItem[] = [
  {
    label: 'OpenAI 兼容',
    value: 'https://api.your-domain.com/v1',
    hint: '给 OpenAI SDK、LangChain、各类客户端用',
  },
  {
    label: 'Anthropic 兼容',
    value: 'https://api.your-domain.com',
    hint: '给 Claude 官方 SDK、Claude Code 用',
  },
  {
    label: '模型清单',
    value: 'https://api.your-domain.com/v1/models',
    hint: '用于拉取当前可用模型',
  },
]
