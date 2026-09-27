import { Table, Tag, Typography } from 'antd'
import type { TablePaginationConfig } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

import { formatQuota } from '@/features/console/quota'
import type { QuotaFormat } from '@/features/console/quota'
import { LOG_TYPES } from '@/features/console/usage'
import type { UsageLog } from '@/features/console/usage'

import styles from './UsageLogTable.module.css'

const TYPE_COLORS: Record<number, string | undefined> = {
  1: 'success',
  5: 'error',
  6: 'processing',
}

function amountText(log: UsageLog, format: QuotaFormat): string {
  if (!log.quota) return '—'
  const text = formatQuota(log.quota, format)
  return log.type === 1 || log.type === 6 ? `+${text}` : text
}

interface Props {
  logs: UsageLog[]
  format: QuotaFormat
  loading?: boolean
  pagination?: TablePaginationConfig | false
  emptyText?: string
}

export function UsageLogTable({ logs, format, loading, pagination = false, emptyText = '暂无记录' }: Props) {
  const columns: ColumnsType<UsageLog> = [
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 150,
      render: (value: number) => <span className={styles.mono}>{dayjs.unix(value).format('MM-DD HH:mm:ss')}</span>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 76,
      render: (value: number) => <Tag color={TYPE_COLORS[value]}>{LOG_TYPES[value] ?? '其他'}</Tag>,
    },
    {
      title: '模型 / 密钥',
      key: 'model',
      render: (_value, log) => (
        <span className={styles.stack}>
          <span className={styles.mono}>{log.model_name || '—'}</span>
          {log.token_name ? <span className={styles.muted}>{log.token_name}</span> : null}
        </span>
      ),
    },
    {
      title: '输入 / 输出 Token',
      key: 'tokens',
      width: 150,
      render: (_value, log) =>
        log.type === 2 ? (
          <span className={styles.mono}>
            {log.prompt_tokens.toLocaleString('zh-CN')} / {log.completion_tokens.toLocaleString('zh-CN')}
          </span>
        ) : (
          '—'
        ),
    },
    {
      title: '耗时',
      key: 'time',
      width: 110,
      render: (_value, log) =>
        log.type === 2 ? (
          <span className={styles.stack}>
            <span>{log.use_time} 秒</span>
            {log.is_stream ? <span className={styles.muted}>流式</span> : null}
          </span>
        ) : (
          '—'
        ),
    },
    {
      title: '金额',
      key: 'quota',
      align: 'right',
      width: 120,
      render: (_value, log) => <span className={styles.amount}>{amountText(log, format)}</span>,
    },
  ]

  return (
    <Table<UsageLog>
      className={styles.table}
      size="middle"
      rowKey={(log) => `${log.created_at}-${log.id}-${log.request_id ?? ''}`}
      columns={columns}
      dataSource={logs}
      loading={loading}
      pagination={pagination}
      scroll={{ x: 760 }}
      locale={{ emptyText }}
      expandable={{
        rowExpandable: (log) => Boolean(log.content || log.request_id),
        expandedRowRender: (log) => (
          <dl className={styles.detail}>
            {log.content ? (
              <div>
                <dt>说明</dt>
                <dd>{log.content}</dd>
              </div>
            ) : null}
            {log.request_id ? (
              <div>
                <dt>请求 ID</dt>
                <dd>
                  <Typography.Text className={styles.mono} copyable={{ text: log.request_id }}>
                    {log.request_id}
                  </Typography.Text>
                </dd>
              </div>
            ) : null}
            {log.group ? (
              <div>
                <dt>分组</dt>
                <dd>{log.group}</dd>
              </div>
            ) : null}
          </dl>
        ),
      }}
    />
  )
}
