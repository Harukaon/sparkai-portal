import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Alert, Button, Form, Input, Select } from 'antd'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { useAuthStore } from '@/features/auth/auth-store'
import { PageHead } from '@/features/console/components/PageHead'
import { UsageLogTable } from '@/features/console/components/UsageLogTable'
import { formatQuota, useQuotaFormat } from '@/features/console/quota'
import {
  LOG_TYPES,
  RANGE_LABELS,
  containsPattern,
  fetchSpend,
  fetchUsageLogs,
  rangeFor,
} from '@/features/console/usage'
import type { LogFilters, RangePreset } from '@/features/console/usage'
import { usePageTitle } from '@/shared/hooks/use-page-title'
import { useT } from '@/shared/i18n'

import styles from './LogsPage.module.css'

interface FilterValues {
  range: RangePreset
  type: number
  model: string
  token: string
}

const INITIAL: FilterValues = { range: '7d', type: 0, model: '', token: '' }

/** 时间在请求时才换算，保证「今天」「近 7 天」总是以当前时刻为准。 */
function toFilters(values: FilterValues): LogFilters {
  return {
    ...rangeFor(values.range),
    type: values.type || undefined,
    model_name: containsPattern(values.model),
    token_name: values.token.trim(),
  }
}

export function LogsPage() {
  const t = useT()
  usePageTitle(t('请求记录', 'Request logs'))
  const userId = useAuthStore((state) => state.user?.id)
  const format = useQuotaFormat()
  const [form] = Form.useForm<FilterValues>()
  const [applied, setApplied] = useState<FilterValues>(INITIAL)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const logs = useQuery({
    queryKey: ['usage-logs', userId, applied, page, pageSize],
    queryFn: () => fetchUsageLogs(toFilters(applied), page, pageSize),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  })
  const spend = useQuery({
    queryKey: ['usage-spend', userId, applied],
    queryFn: () => fetchSpend(toFilters(applied)),
    enabled: Boolean(userId),
  })

  function apply(values: FilterValues) {
    setApplied({ ...INITIAL, ...values })
    setPage(1)
  }

  function reset() {
    form.setFieldsValue(INITIAL)
    apply(INITIAL)
  }

  return (
    <div>
      <PageHead
        title={t('请求记录', 'Request logs')}
        description={t('每一次调用的模型、用量和花费；点开一行可查看请求 ID 和说明。', 'Model, tokens, and cost of every call. Expand a row for the request ID and notes.')}
        actions={
          <Button icon={<ReloadOutlined />} loading={logs.isFetching} onClick={() => { void logs.refetch(); void spend.refetch() }}>
            {t('刷新', 'Refresh')}
          </Button>
        }
      />

      <Form<FilterValues> form={form} className={styles.filters} initialValues={INITIAL} onFinish={apply} layout="vertical">
        <Form.Item name="range" label={t('时间', 'Time')}>
          <Select options={Object.entries(RANGE_LABELS).map(([value, label]) => ({ value, label }))} />
        </Form.Item>
        <Form.Item name="type" label={t('类型', 'Type')}>
          <Select
            options={[{ value: 0, label: t('全部类型', 'All types') }, ...Object.entries(LOG_TYPES).map(([value, label]) => ({ value: Number(value), label: t(...label) }))]}
          />
        </Form.Item>
        <Form.Item name="model" label={t('模型', 'Model')}>
          <Input placeholder={t('输入模型名的一部分', 'Part of a model name')} allowClear />
        </Form.Item>
        <Form.Item name="token" label={t('密钥名称', 'Key name')}>
          <Input placeholder={t('完整的密钥名称', 'The exact key name')} allowClear />
        </Form.Item>
        <div className={styles.buttons}>
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>{t('查询', 'Apply')}</Button>
          <Button onClick={reset}>{t('重置', 'Reset')}</Button>
        </div>
      </Form>

      <div className={styles.summary}>
        <span>
          {t(...RANGE_LABELS[applied.range])} {t('消费合计', 'spend total')}
          <strong>{spend.data ? formatQuota(spend.data.quota, format) : spend.isError ? '—' : '…'}</strong>
        </span>
        <span>
          {t('共', '')} <strong>{(logs.data?.total ?? 0).toLocaleString()}</strong> {t('条记录', 'records in total')}
        </span>
      </div>

      {logs.isError ? (
        <Alert type="error" showIcon title={t('请求记录暂时获取不到', 'Logs unavailable right now')} action={<Button size="small" onClick={() => void logs.refetch()}>{t('重试', 'Retry')}</Button>} />
      ) : (
        <UsageLogTable
          logs={logs.data?.items ?? []}
          format={format}
          loading={logs.isFetching}
          emptyText={t('这个范围内没有记录，换个时间或筛选条件试试', 'No records in this range — try another time or filter')}
          pagination={{
            current: page,
            pageSize,
            total: logs.data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => t(`共 ${total} 条`, `${total} in total`),
            onChange: (nextPage, nextSize) => {
              setPage(nextSize === pageSize ? nextPage : 1)
              setPageSize(nextSize)
            },
          }}
        />
      )}
    </div>
  )
}
