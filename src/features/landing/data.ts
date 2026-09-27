import type { PriceRow, StatItem } from '@/features/landing/types'

/*
 * ⚠️ 示例数据：价格是占位的，定价确认后替换。
 * 单位统一为「美元 / 百万 token」，与各厂商官网口径一致。
 * 接后端接口时，把这里换成 `useQuery` 拉取的数据即可（结构见 types.ts）。
 */
export const PRICE_ROWS: PriceRow[] = [
  {
    id: 'gpt-5.1',
    name: 'GPT-5.1',
    provider: 'OpenAI',
    official: { input: 1.25, output: 10 },
    ours: { input: 0.45, output: 3.6 },
  },
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    official: { input: 3, output: 15 },
    ours: { input: 1.1, output: 5.4 },
  },
  {
    id: 'deepseek-v3.2',
    name: 'DeepSeek V3.2',
    provider: 'DeepSeek',
    official: { input: 0.27, output: 1.1 },
    ours: { input: 0.1, output: 0.4 },
  },
  {
    id: 'glm-4.6',
    name: 'GLM-4.6',
    provider: '智谱',
    official: { input: 0.6, output: 2.2 },
    ours: { input: 0.22, output: 0.8 },
  },
]

/**
 * ⚠️ 底部数据带。
 * 「10,000+ 开发者的选择」「99.9% 服务可用性」是对外承诺，上线前必须确认能兑现，
 * 拿不准就先删掉对应条目 —— 写上去的数字是要负责的。
 */
export const STATS: StatItem[] = [
  { icon: 'users', value: '10,000+', label: '开发者的选择' },
  { icon: 'cube', value: '主流模型全覆盖', label: 'OpenAI · Anthropic · DeepSeek · 智谱等' },
  { icon: 'bolt', value: '99.9%', label: '服务可用性' },
  { icon: 'globe', value: '全球加速', label: '更快 · 更稳定 · 更可靠' },
]
