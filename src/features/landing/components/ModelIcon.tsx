import type { ReactNode } from 'react'

import styles from './ModelIcon.module.css'

/**
 * 模型图标：品牌色圆角方块 + 简化标记。
 * 这不是各家官方 logo，只用于在列表里一眼区分厂商；
 * 以后要换成官方图标，只改这一个文件。
 */
const GLYPHS: Record<string, ReactNode> = {
  'gpt-5.1': (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.5a5 5 0 0 0-4.3 2.4 5 5 0 0 0-3.9 8.2 5 5 0 0 0 6 5.9A5 5 0 0 0 17.3 19a5 5 0 0 0 3.9-8.2 5 5 0 0 0-6-5.9A5 5 0 0 0 12 2.5Zm0 2.2 3.4 2v4l-3.4 2-3.4-2v-4l3.4-2Zm-5 3.6 3.4 2v4L6 16.3l-1.7-4.7 2.7-3.3ZM17 8.3l2.7 3.3L18 16.3l-4.4-2v-4l3.4-2ZM7.6 18l3.4-2 3.4 2-1 3.2h-4.8L7.6 18Z"
      />
    </svg>
  ),
  'claude-sonnet-4-5': <span className={styles.letter}>AI</span>,
  'deepseek-v3.2': (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3c-1.4 2.2-3.4 3.6-5.6 4.3 1.4 1 2.4 2.3 2.8 3.9-1.5-.4-3-.3-4.2.3 1 1.3 2.4 2.2 4.1 2.6 1.9.4 3.5 1.5 4.4 3.1.9-1.6 2.5-2.7 4.4-3.1 1.7-.4 3.1-1.3 4.1-2.6-1.2-.6-2.7-.7-4.2-.3.4-1.6 1.4-2.9 2.8-3.9C18.4 6.6 16.4 5.2 15 3c-.9 1.6-1.9 2.6-3 3.4-1.1-.8-2.1-1.8-3-3.4Z"
      />
    </svg>
  ),
  'glm-4.6': (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <g fill="currentColor">
        <circle cx="6" cy="6" r="2" />
        <circle cx="12" cy="6" r="2" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="6" cy="12" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="6" cy="18" r="2" />
      </g>
    </svg>
  ),
}

/** 取不到品牌样式时，退回模型名首字母 */
export function ModelIcon({ modelId, name }: { modelId: string; name: string }) {
  const glyph = GLYPHS[modelId]

  return (
    <span className={styles.icon} data-model={modelId} aria-hidden="true">
      {glyph ?? <span className={styles.letter}>{name.slice(0, 1)}</span>}
    </span>
  )
}
