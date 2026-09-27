import { BrandIcon } from '@/shared/components/BrandIcon'

import styles from './ModelIcon.module.css'

/**
 * 模型图标的方块外框。图标本身来自 New API 同一套图标库：
 * 模型广场里用后台给模型/厂商配置的图标名，首页示例用固定的厂商名。
 */
export function ModelIcon({ icon, name }: { icon?: string | null; name: string }) {
  return <BrandIcon className={styles.icon} icon={icon} fallback={name} size={20} />
}
