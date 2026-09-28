import { Tooltip } from 'antd'

import { endpointLabel } from '@/features/models/endpoint-label'
import { BrandIcon } from '@/shared/components/BrandIcon'

import styles from './EndpointTags.module.css'

/**
 * 接口类型：小图标 + 悬浮显示全名。
 *
 * openai / anthropic / gemini 用对应品牌图标；
 * openai-response 属于 OpenAI 的 Responses 协议，同样用 OpenAI 图标。
 * 没有对应图标的类型退回文字标签。
 */
const BRAND_BY_ENDPOINT: Record<string, string> = {
  openai: 'OpenAI',
  'openai-response': 'OpenAI',
  anthropic: 'Anthropic',
  'anthropic-chat': 'Anthropic',
  gemini: 'Gemini',
}

export function EndpointTags({ endpoints }: { endpoints: string[] }) {
  if (!endpoints.length) return null
  return (
    <div className={styles.tags}>
      {endpoints.map((endpoint) => {
        const brand = BRAND_BY_ENDPOINT[endpoint.toLowerCase()]
        if (!brand) {
          return (
            <Tooltip key={endpoint} title={endpointLabel(endpoint)}>
              <span className={`${styles.chip} ${styles.textChip}`}>{endpoint}</span>
            </Tooltip>
          )
        }
        return (
          <Tooltip key={endpoint} title={endpointLabel(endpoint)}>
            <span className={styles.chip} role="img" aria-label={endpointLabel(endpoint)}>
              <BrandIcon icon={brand} fallback={endpoint.slice(0, 1)} size={16} />
            </span>
          </Tooltip>
        )
      })}
    </div>
  )
}
