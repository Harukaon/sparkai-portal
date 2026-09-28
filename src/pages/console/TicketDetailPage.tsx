import { ArrowLeftOutlined, CheckCircleOutlined, CustomerServiceOutlined } from '@ant-design/icons'
import { Alert, App as AntdApp, Button, Input, Popconfirm, Select, Skeleton, Tag } from 'antd'
import type { UploadFile } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/auth-store'
import { fetchTicket, replyTicket, setTicketStatus } from '@/features/tickets/api'
import type { TicketMessage, TicketStatus } from '@/features/tickets/api'
import { ImagePicker } from '@/features/tickets/components/ImagePicker'
import { TicketImage } from '@/features/tickets/components/TicketImage'
import { CATEGORY_LABELS, CONTENT_MAX, STATUS_LABELS, isUploading, uploadedIds } from '@/features/tickets/labels'
import { ApiError, errorMessage } from '@/shared/api/client'
import { usePageTitle } from '@/shared/hooks/use-page-title'
import { useT } from '@/shared/i18n'

import styles from './TicketDetailPage.module.css'

function Message({ message }: { message: TicketMessage }) {
  const t = useT()
  const name = message.is_staff
    ? message.author_name
      ? t(`客服 · ${message.author_name}`, `Support · ${message.author_name}`)
      : t('客服', 'Support')
    : message.is_mine
      ? t('我', 'Me')
      : message.author_name || t('用户', 'User')

  return (
    <li className={`${styles.message} ${message.is_staff ? styles.staff : ''}`}>
      <div className={styles.meta}>
        <span className={styles.author}>
          {message.is_staff ? <CustomerServiceOutlined aria-hidden /> : null}
          {name}
        </span>
        <time className={styles.time}>{dayjs.unix(message.created_at).format('YYYY-MM-DD HH:mm')}</time>
      </div>
      {message.content ? <p className={styles.content}>{message.content}</p> : null}
      {message.images.length > 0 ? (
        <div className={styles.images}>
          {message.images.map((id) => (
            <TicketImage key={id} id={id} />
          ))}
        </div>
      ) : null}
    </li>
  )
}

/**
 * 工单详情：上面是来回的对话，下面是回复框。
 * 用户和管理员共用这个页面（admin 模式下多一个改状态的下拉框，返回到工单管理）。
 */
export function TicketDetailPage({ admin = false }: { admin?: boolean }) {
  const t = useT()
  const { message } = AntdApp.useApp()
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.user?.id)
  const ticketId = Number(useParams().id)
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<UploadFile[]>([])
  const [sending, setSending] = useState(false)
  const [changing, setChanging] = useState(false)

  const detail = useQuery({
    queryKey: ['ticket', userId, ticketId],
    queryFn: () => fetchTicket(ticketId),
    enabled: Boolean(userId) && Number.isInteger(ticketId),
    refetchInterval: 60_000,
  })
  const ticket = detail.data?.ticket
  usePageTitle(ticket ? `#${ticket.id} ${ticket.title}` : t('工单', 'Ticket'))
  const backTo = admin ? '/console/admin/tickets' : '/console/tickets'

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['ticket', userId, ticketId] })
    void queryClient.invalidateQueries({ queryKey: ['tickets'] })
    void queryClient.invalidateQueries({ queryKey: ['ticket-summary'] })
  }

  async function send() {
    const images = uploadedIds(files)
    if (!content.trim() && images.length === 0) {
      message.warning(t('写点内容再发送', 'Write something first'))
      return
    }
    if (isUploading(files)) {
      message.warning(t('图片还在上传，请稍等', 'Images are still uploading'))
      return
    }
    setSending(true)
    try {
      await replyTicket(ticketId, content.trim(), images)
      setContent('')
      setFiles([])
      refresh()
    } catch (error: unknown) {
      message.error(errorMessage(error, t('发送失败，请稍后重试', 'Could not send — please try again')))
    } finally {
      setSending(false)
    }
  }

  async function changeStatus(status: TicketStatus) {
    setChanging(true)
    try {
      await setTicketStatus(ticketId, status)
      message.success(status === 'closed' ? t('工单已关闭', 'Ticket closed') : t('状态已更新', 'Status updated'))
      refresh()
    } catch (error: unknown) {
      message.error(errorMessage(error, t('操作失败，请稍后重试', 'Something went wrong — please try again')))
    } finally {
      setChanging(false)
    }
  }

  const back = (
    <Link to={backTo} className={styles.back}>
      <ArrowLeftOutlined /> {admin ? t('返回工单管理', 'Back to ticket desk') : t('返回我的工单', 'Back to my tickets')}
    </Link>
  )

  if (detail.isError) {
    const missing = detail.error instanceof ApiError && detail.error.status === 404
    return (
      <div>
        {back}
        <Alert
          type={missing ? 'warning' : 'error'}
          showIcon
          title={missing ? t('工单不存在，或者不是你的工单', 'Ticket not found') : t('工单暂时获取不到', 'Could not load the ticket')}
          action={missing ? undefined : <Button size="small" onClick={() => void detail.refetch()}>{t('重试', 'Retry')}</Button>}
        />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div>
        {back}
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    )
  }

  const closed = ticket.status === 'closed'

  return (
    <div>
      {back}
      <header className={styles.head}>
        <div className={styles.headText}>
          <h1>
            <span className={styles.no}>#{ticket.id}</span> {ticket.title}
          </h1>
          <p className={styles.sub}>
            <Tag color={STATUS_LABELS[ticket.status].color}>{t(...STATUS_LABELS[ticket.status].label)}</Tag>
            <span>{t(...(CATEGORY_LABELS[ticket.category] ?? [ticket.category, ticket.category]))}</span>
            <span>·</span>
            <span>{t('提交于', 'Opened')} {dayjs.unix(ticket.created_at).format('YYYY-MM-DD HH:mm')}</span>
            {admin && ticket.user ? (
              <>
                <span>·</span>
                <span>
                  {ticket.user.display_name || ticket.user.username}（ID {ticket.user.id}
                  {ticket.user.email ? ` · ${ticket.user.email}` : ''}）
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className={styles.headActions}>
          {admin ? (
            <Select<TicketStatus>
              value={ticket.status}
              loading={changing}
              onChange={(value) => void changeStatus(value)}
              style={{ width: 120 }}
              aria-label={t('修改状态', 'Change status')}
              options={(Object.keys(STATUS_LABELS) as TicketStatus[]).map((value) => ({ value, label: t(...STATUS_LABELS[value].label) }))}
            />
          ) : closed ? null : (
            <Popconfirm
              title={t('问题已经解决了吗？', 'Is your issue resolved?')}
              description={t('关闭后仍然可以继续回复，回复会重新打开工单。', 'You can still reply later; replying reopens the ticket.')}
              okText={t('关闭工单', 'Close ticket')}
              cancelText={t('再等等', 'Not yet')}
              onConfirm={() => void changeStatus('closed')}
            >
              <Button icon={<CheckCircleOutlined />} loading={changing}>
                {t('已解决，关闭工单', 'Resolved — close')}
              </Button>
            </Popconfirm>
          )}
        </div>
      </header>

      <ol className={styles.thread}>
        {(detail.data?.messages ?? []).map((item) => (
          <Message key={item.id} message={item} />
        ))}
      </ol>

      <section className={styles.reply} aria-label={t('回复', 'Reply')}>
        {closed ? (
          <p className={styles.closedHint}>
            {admin ? t('工单已关闭。再次回复会通知用户并把状态改成「已回复」。', 'Closed. Replying marks it "Replied" again.') : t('工单已关闭。如果问题还在，直接回复即可重新打开。', 'This ticket is closed. Reply to reopen it.')}
          </p>
        ) : null}
        <Input.TextArea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={4}
          maxLength={CONTENT_MAX}
          placeholder={admin ? t('回复用户…', 'Reply to the user…') : t('补充说明或继续追问…', 'Add details or ask a follow-up…')}
          aria-label={t('回复内容', 'Reply')}
        />
        <div className={styles.replyBar}>
          <ImagePicker value={files} onChange={setFiles} />
          <Button type="primary" loading={sending} onClick={() => void send()}>
            {admin ? t('回复用户', 'Send reply') : t('发送', 'Send')}
          </Button>
        </div>
      </section>
    </div>
  )
}
