import type { PriceRow, StatItem } from '@/features/landing/types'
import type { Lang } from '@/shared/i18n'

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

/** 只描述产品已支持的能力，不放未核实的用户数和可用率承诺。文案为 [中文, 英文]。 */
export const STATS: StatItem[] = [
  { icon: 'shield', value: ['零数据保留', 'Zero data retention'], label: ['不存任何请求内容', 'Nothing you send is stored'] },
  { icon: 'globe', value: ['一个地址', 'One address'], label: ['各家旗舰模型随心切换', 'Every flagship model'] },
  { icon: 'cube', value: ['稳定可靠', 'Stable'], label: ['多线路保障不掉线', 'Redundant routes'] },
  { icon: 'bolt', value: ['快速响应', 'Fast'], label: ['低延迟，优质服务', 'Low latency, quality service'] },
]

export function pickText(text: [string, string], lang: Lang): string {
  return lang === 'zh' ? text[0] : text[1]
}
