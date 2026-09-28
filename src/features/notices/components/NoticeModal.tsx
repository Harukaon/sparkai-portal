import { Button, Modal } from 'antd'
import { useState } from 'react'

import { useNotice } from '@/features/notices/api'
import { markNoticeSeen, noticeAlreadySeen } from '@/features/notices/seen'
import { Markdown } from '@/shared/components/Markdown'
import { useT } from '@/shared/i18n'

/**
 * 后台「系统通知」：打开网站时弹一次；点「我知道了」后不再弹，
 * 直到后台改了通知内容。
 */
export function NoticeModal() {
  const t = useT()
  const notice = useNotice()
  const [dismissed, setDismissed] = useState<string | null>(null)
  const content = (notice.data ?? '').trim()

  if (!content || dismissed === content || noticeAlreadySeen(content)) return null

  function close() {
    markNoticeSeen(content)
    setDismissed(content)
  }

  return (
    <Modal
      open
      title={t('系统通知', 'Notice')}
      onCancel={close}
      footer={<Button type="primary" onClick={close}>{t('我知道了', 'Got it')}</Button>}
      width={560}
    >
      <Markdown>{content}</Markdown>
    </Modal>
  )
}
