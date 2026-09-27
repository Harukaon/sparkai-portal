import type { PriceRow, StatItem } from '@/features/landing/types'

/*
 * ⚠️ 示例数据：价格是占位的，定价确认后替换。
 * 单位统一为「美元 / 百万 token」，与各厂商官网口径一致。
 * 首页只作计算示意，不作为报价；实际可用模型及价格以 /models 为准。
 */
export const PRICE_ROWS: PriceRow[] = [
  {
    id: 'gpt-5.1',
    name: 'GPT-5.1',
    provider: 'OpenAI',
    icon: 'OpenAI',
    official: { input: 1.25, output: 10 },
    ours: { input: 0.45, output: 3.6 },
  },
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    icon: 'Claude.Color',
    official: { input: 3, output: 15 },
    ours: { input: 1.1, output: 5.4 },
  },
  {
    id: 'deepseek-v3.2',
    name: 'DeepSeek V3.2',
    provider: 'DeepSeek',
    icon: 'DeepSeek.Color',
    official: { input: 0.27, output: 1.1 },
    ours: { input: 0.1, output: 0.4 },
  },
  {
    id: 'glm-4.6',
    name: 'GLM-4.6',
    provider: '智谱',
    icon: 'Zhipu.Color',
    official: { input: 0.6, output: 2.2 },
    ours: { input: 0.22, output: 0.8 },
  },
]

/** 只描述产品已支持的能力，不放未核实的用户数和可用率承诺。 */
export const STATS: StatItem[] = [
  { icon: 'users', value: '账号自助管理', label: '注册 · 登录 · 密钥' },
  { icon: 'cube', value: '主流协议兼容', label: 'OpenAI · Anthropic' },
  { icon: 'bolt', value: '按量计费', label: '用量与请求记录可查' },
  { icon: 'globe', value: '统一入口', label: '一套地址接入开放的模型' },
]
