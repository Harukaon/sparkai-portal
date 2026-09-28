import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Input, Segmented, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/auth-store'
import { PageHead } from '@/features/console/components/PageHead'
import { fetchTickets } from '@/features/tickets/api'
import type { Ticket, TicketStatus } from '@/features/tickets/api'
import { NewTicketModal } from '@/features/tickets/components/NewTicketModal'
import { CATEGORY_LABELS, STATUS_LABELS } from '@/features/tickets/labels'
import { usePageTitle } from '@/shared/hooks/use-page-title'
import { useT } from '@/shared/i18n'

import styles from './TicketsPage.module.css'

type StatusFilter = TicketStatus | 'all'

/**
 * 工单列表。
 * - 普通用户：看自己的工单，右上角「提交工单」；
 * - admin 模式（/console/admin/tickets）：看所有人的，默认只列「待处理」，可按用户名/邮箱/标题搜索。
 */
export function TicketsPage({ admin = false }: { admin?: boolean }) {
  const t = useT()
  const title = admin ? t('工单管理', 'Ticket desk') : t('工单', 'Support tickets')
  usePageTitle(title)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.user?.id)
  const [status, setStatus] = useState<StatusFilter>(admin ? 'open' : 'all')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [creating, setCreating] = useState(false)

  const list = useQuery({
    queryKey: ['tickets', userId, admin, status, keyword, page, pageSize],
    queryFn: () => fetchTickets({ page, pageSize, status: status === 'all' ? undefined : status, all: admin, keyword }),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  })

  const detailPath = (ticket: Ticket) => (admin ? `/console/admin/tickets/${ticket.id}` : `/console/tickets/${ticket.id}`)

  const columns: ColumnsType<Ticket> = [
    {
      title: t('工单', 'Ticket'),
      dataIndex: 'title',
      render: (value: string, ticket) => (
        <Link to={detailPath(ticket)} className={styles.titleCell}>
          <span className={styles.ticketNo}>#{ticket.id}</span>
          <span className={styles.ticketTitle}>{value}</span>
        </Link>
      ),
    },
    ...(admin
      ? [
          {
            title: t('提交人', 'From'),
            key: 'user',
            render: (_: unknown, ticket: Ticket) => (
              <span className={styles.stack}>
                <span>{ticket.user?.display_name || ticket.user?.username}</span>
                <span className={styles.muted}>{ticket.user?.email || `ID ${ticket.user?.id ?? ''}`}</span>
              </span>
            ),
          },
        ]
      : []),
    {
      title: t('类型', 'Category'),
      dataIndex: 'category',
      width: 120,
      render: (value: Ticket['category']) => t(...(CATEGORY_LABELS[value] ?? [value, value])),
    },
    {
      title: t('状态', 'Status'),
      dataIndex: 'status',
      width: 110,
      render: (value: TicketStatus) => {
        // 用户视角：客服已回复是需要他去看的；管理员视角：待处理是需要去回的
        const highlight = admin ? value === 'open' : value === 'replied'
        return (
          <Tag color={STATUS_LABELS[value].color} className={highlight ? styles.highlight : undefined}>
            {t(...STATUS_LABELS[value].label)}
          </Tag>
        )
      },
    },
    {
      title: t('最后更新', 'Updated'),
      dataIndex: 'updated_at',
      width: 160,
      render: (value: number) => <span className={styles.mono}>{dayjs.unix(value).format('YYYY-MM-DD HH:mm')}</span>,
    },
  ]

  return (
    <div>
      <PageHead
        title={title}
        description={
          admin
            ? t('所有用户提交的工单。回复后状态变为「已回复」，用户追问会回到「待处理」。', 'All user tickets. Replying marks a ticket "Replied"; a user follow-up moves it back to "Open".')
            : t('遇到充值、扣费、接口报错等问题，在这里提交，我们会尽快回复。', 'Questions about top-ups, billing or API errors? Submit a ticket and we will get back to you.')
        }
        actions={
          <>
            <Button icon={<ReloadOutlined />} onClick={() => void list.refetch()} loading={list.isFetching}>
              {t('刷新', 'Refresh')}
            </Button>
            {admin ? null : (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
                {t('提交工单', 'New ticket')}
              </Button>
            )}
          </>
        }
      />

      <div className={styles.filters}>
        <Segmented<StatusFilter>
          value={status}
          onChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
          options={[
            { value: 'all', label: t('全部', 'All') },
            { value: 'open', label: t(...STATUS_LABELS.open.label) },
            { value: 'replied', label: t(...STATUS_LABELS.replied.label) },
            { value: 'closed', label: t(...STATUS_LABELS.closed.label) },
          ]}
        />
        {admin ? (
          <Input.Search
            allowClear
            className={styles.search}
            placeholder={t('搜索标题、用户名、邮箱或工单号', 'Search title, username, email or #')}
            onSearch={(value) => {
              setKeyword(value.trim())
              setPage(1)
            }}
          />
        ) : null}
      </div>

      {list.isError ? (
        <Alert
          type="error"
          showIcon
          title={t('工单列表暂时获取不到', 'Could not load tickets')}
          action={<Button size="small" onClick={() => void list.refetch()}>{t('重试', 'Retry')}</Button>}
        />
      ) : (
        <Table<Ticket>
          className={styles.table}
          rowKey="id"
          columns={columns}
          dataSource={list.data?.items ?? []}
          loading={list.isFetching && !list.data}
          scroll={{ x: admin ? 820 : 640 }}
          onRow={(ticket) => ({ onClick: (event) => {
            if ((event.target as HTMLElement).closest('a')) return
            navigate(detailPath(ticket))
          }, className: styles.row })}
          locale={{ emptyText: admin ? t('没有符合条件的工单', 'No tickets match') : t('还没有工单。有问题随时点右上角「提交工单」。', 'No tickets yet. Use "New ticket" any time.') }}
          pagination={{
            current: page,
            pageSize,
            total: list.data?.total ?? 0,
            hideOnSinglePage: true,
            onChange: (nextPage, nextSize) => {
              setPage(nextSize === pageSize ? nextPage : 1)
              setPageSize(nextSize)
            },
          }}
        />
      )}

      {admin ? null : (
        <NewTicketModal
          open={creating}
          onClose={() => setCreating(false)}
          onCreated={(ticket) => {
            setCreating(false)
            void queryClient.invalidateQueries({ queryKey: ['tickets'] })
            navigate(`/console/tickets/${ticket.id}`)
          }}
        />
      )}
    </div>
  )
}
