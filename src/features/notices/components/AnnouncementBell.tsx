import { BellOutlined, PushpinOutlined } from '@ant-design/icons'
import { Badge, Button, Popover, Tooltip } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'

import { useAnnouncements, useNotice } from '@/features/notices/api'
import type { AnnouncementType } from '@/features/notices/api'
import { markAnnouncementsSeen, markNoticeSeen, noticeAlreadySeen, readAnnouncementSeenAt, unreadCount } from '@/features/notices/seen'
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
 * 右上角唯一的消息入口：New API 的「系统通知」置顶，下面是「系统公告」列表。
 * 有没看过的内容时亮小红点，点开就算看过。
 */
export function AnnouncementBell() {
  const t = useT()
  const list = useAnnouncements()
  const notice = (useNotice().data ?? '').trim()
  const [seenAt, setSeenAt] = useState(readAnnouncementSeenAt)
  const [noticeSeen, setNoticeSeen] = useState(() => noticeAlreadySeen(notice))
  const [open, setOpen] = useState(false)

  const noticeUnread = notice !== '' && !noticeSeen && !noticeAlreadySeen(notice)
  const unread = unreadCount(list, seenAt) + (noticeUnread ? 1 : 0)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) return
    setSeenAt(markAnnouncementsSeen(list))
    if (notice) {
      markNoticeSeen(notice)
      setNoticeSeen(true)
    }
  }

  const empty = list.length === 0 && !notice

  const content = (
    <div className={styles.panel}>
      <div className={styles.panelHead}>{t('通知与公告', 'Notices')}</div>
      {empty ? (
        <p className={styles.empty}>{t('暂无公告', 'Nothing here yet')}</p>
      ) : (
        <ul className={styles.list}>
          {notice ? (
            <li className={`${styles.item} ${styles.pinned}`}>
              <PushpinOutlined className={styles.pin} aria-label={t('置顶', 'Pinned')} />
              <div className={styles.body}>
                <Markdown>{notice}</Markdown>
              </div>
            </li>
          ) : null}
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
      )}
    </div>
  )

  const label = unread > 0 ? t(`通知与公告，${unread} 条未读`, `Notices, ${unread} unread`) : t('通知与公告', 'Notices')

  return (
    <Popover content={content} trigger="click" placement="bottomRight" open={open} onOpenChange={handleOpenChange} arrow={false}>
      <Tooltip title={open ? undefined : t('通知与公告', 'Notices')}>
        <Badge dot={unread > 0} offset={[-6, 6]}>
          <Button type="text" className={styles.trigger} aria-label={label} icon={<BellOutlined aria-hidden />} />
        </Badge>
      </Tooltip>
    </Popover>
  )
}
