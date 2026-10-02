import type { StatItem } from '@/features/landing/types'
import type { Lang } from '@/shared/i18n'

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
