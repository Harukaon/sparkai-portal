import { BellOutlined } from '@ant-design/icons'
import { Badge, Button, Popover, Tooltip } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'

import { useAnnouncements } from '@/features/notices/api'
import type { AnnouncementType } from '@/features/notices/api'
import { markAnnouncementsSeen, readAnnouncementSeenAt, unreadCount } from '@/features/notices/seen'
import { Markdown } from '@/shared/components/Markdown'
import { useT } from '@/shared/i18n'

import styles from './AnnouncementBell.module.css'

const TYPE_CLASS: Record<AnnouncementType, string | undefined> = {
  default: styles.dotDefault,
  ongoing: styles.dotOngoing,
  success: styles.dotSuccess,
  warning: styles.dotWarning,
  error: styles.dotError,
}

/**
 * 顶栏小铃铛：展示后台发布的公告列表，有新公告时亮一个小红点，点开就算看过。
 * 后台没开公告或者一条都没有时整个不显示，不占位置。
 */
export function AnnouncementBell() {
  const t = useT()
  const list = useAnnouncements()
  const [seenAt, setSeenAt] = useState(readAnnouncementSeenAt)
  const [open, setOpen] = useState(false)

  if (list.length === 0) return null

  const unread = unreadCount(list, seenAt)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) setSeenAt(markAnnouncementsSeen(list))
  }

  const content = (
    <div className={styles.panel}>
      <div className={styles.panelHead}>{t('系统公告', 'Announcements')}</div>
      <ul className={styles.list}>
        {list.map((item, index) => (
          <li key={`${item.publishDate}-${index}`} className={styles.item}>
            <span className={`${styles.dot} ${TYPE_CLASS[item.type ?? 'default'] ?? styles.dotDefault}`} aria-hidden="true" />
            <div className={styles.body}>
              <Markdown>{item.content}</Markdown>
              {item.extra ? <p className={styles.extra}>{item.extra}</p> : null}
              <time className={styles.time} dateTime={item.publishDate}>
                {dayjs(item.publishDate).format('YYYY-MM-DD HH:mm')}
              </time>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )

  const label = unread > 0 ? t(`系统公告，${unread} 条未读`, `Announcements, ${unread} unread`) : t('系统公告', 'Announcements')

  return (
    <Popover content={content} trigger="click" placement="bottomRight" open={open} onOpenChange={handleOpenChange} arrow={false}>
      <Tooltip title={open ? undefined : t('公告', 'Announcements')}>
        <Badge dot={unread > 0} offset={[-6, 6]}>
          <Button type="text" className={styles.trigger} aria-label={label} icon={<BellOutlined aria-hidden />} />
        </Badge>
      </Tooltip>
    </Popover>
  )
}
