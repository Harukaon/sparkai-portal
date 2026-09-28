import { PictureOutlined } from '@ant-design/icons'
import { Image } from 'antd'
import { useQuery } from '@tanstack/react-query'

import { fetchTicketImage } from '@/features/tickets/api'
import { useT } from '@/shared/i18n'

import styles from './TicketImage.module.css'

/**
 * 工单里的一张图：带登录令牌取回，转成本地地址显示，点开可放大。
 * 同一张图整个会话内只取一次（工单图片不会变）。
 */
export function TicketImage({ id }: { id: string }) {
  const t = useT()
  const image = useQuery({
    queryKey: ['ticket-image', id],
    queryFn: async () => URL.createObjectURL(await fetchTicketImage(id)),
    staleTime: Infinity,
    gcTime: Infinity,
  })

  if (image.isError) {
    return (
      <span className={styles.placeholder} title={t('图片加载失败', 'Image failed to load')}>
        <PictureOutlined />
      </span>
    )
  }
  if (!image.data) return <span className={`${styles.placeholder} ${styles.loading}`} />
  return <Image src={image.data} width={96} height={96} className={styles.image} alt={t('工单附图', 'Ticket attachment')} />
}
