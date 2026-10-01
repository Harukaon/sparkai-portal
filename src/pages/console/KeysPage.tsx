import { CopyOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { App as AntdApp, Alert, Button, Popconfirm, Switch, Table, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'

import { useAuthStore } from '@/features/auth/auth-store'
import { useSystemStatus } from '@/features/auth/hooks'
import { PageHead } from '@/features/console/components/PageHead'
import { formatQuota, useQuotaFormat } from '@/features/console/quota'
import { KEY_STATUS, createKey, deleteKey, fetchFullKey, fetchKeys, setKeyStatus, updateKey, withPrefix } from '@/features/keys/api'
import type { ApiKey, KeyInput } from '@/features/keys/api'
import { KeyFormModal } from '@/features/keys/components/KeyFormModal'
import { KeyRevealModal } from '@/features/keys/components/KeyRevealModal'
import { fromKey } from '@/features/keys/form'
import { errorMessage } from '@/shared/api/client'
import { usePageTitle } from '@/shared/hooks/use-page-title'
import { useT } from '@/shared/i18n'

import styles from './KeysPage.module.css'

type Editing = { mode: 'create' } | { mode: 'edit'; key: ApiKey } | null

export function KeysPage() {
  const t = useT()
  usePageTitle(t('API 密钥', 'API Keys'))
  const { message } = AntdApp.useApp()
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.user?.id)
  const system = useSystemStatus()
  const format = useQuotaFormat()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [editing, setEditing] = useState<Editing>(null)
  const [revealed, setRevealed] = useState<{ title: string; key: string } | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const keys = useQuery({
    queryKey: ['api-keys', userId, page, pageSize],
    queryFn: () => fetchKeys(page, pageSize),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  })

  const origin = (system.data?.server_address || window.location.origin).replace(/\/+$/, '')

  function refresh() {
    return queryClient.invalidateQueries({ queryKey: ['api-keys', userId] })
  }

  async function copyText(text: string, done: string) {
    try {
      await navigator.clipboard.writeText(text)
      message.success(done)
      return true
    } catch {
      return false
    }
  }

  async function copyKey(key: ApiKey) {
    setBusyId(key.id)
    try {
      const full = await fetchFullKey(key.id)
      if (!(await copyText(full, t(`已复制「${key.name}」的密钥`, `Copied the key of "${key.name}"`)))) {
        setRevealed({ title: t(`「${key.name}」的密钥`, `Key of "${key.name}"`), key: full })
      }
    } catch (error: unknown) {
      message.error(errorMessage(error, t('获取密钥失败', 'Could not fetch the key')))
    } finally {
      setBusyId(null)
    }
  }

  async function handleSubmit(input: KeyInput) {
    if (editing?.mode === 'edit') {
      await updateKey(editing.key.id, input)
      message.success(t('已保存', 'Saved'))
      setEditing(null)
      await refresh()
      return
    }
    await createKey(input)
    setEditing(null)
    setPage(1)
    await refresh()
    // 新建接口不返回密钥：列表按创建时间倒序，取最新一条再单独拿完整密钥
    try {
      const latest = (await fetchKeys(1, 1)).items[0]
      if (latest && latest.name === input.name) {
        setRevealed({ title: t('密钥已创建', 'Key created'), key: await fetchFullKey(latest.id) })
        return
      }
    } catch {
      // 取不到也不影响创建结果，用户可在列表里点复制
    }
    message.success(t('密钥已创建，可在列表中复制', 'Key created — copy it from the list'))
  }

  async function toggle(key: ApiKey, enabled: boolean) {
    setBusyId(key.id)
    try {
      await setKeyStatus(key.id, enabled)
      message.success(enabled ? t('已启用', 'Enabled') : t('已停用', 'Disabled'))
      await refresh()
    } catch (error: unknown) {
      message.error(errorMessage(error, t('操作失败', 'Action failed')))
    } finally {
      setBusyId(null)
    }
  }

  async function remove(key: ApiKey) {
    try {
      await deleteKey(key.id)
      message.success(t('已删除', 'Deleted'))
      if (keys.data?.items.length === 1 && page > 1) setPage(page - 1)
      await refresh()
    } catch (error: unknown) {
      message.error(errorMessage(error, t('删除失败', 'Delete failed')))
    }
  }

  const columns: ColumnsType<ApiKey> = [
    {
      title: t('名称', 'Name'),
      key: 'name',
      render: (_value, key) => (
        <span className={styles.stack}>
          <strong>{key.name}</strong>
          <Tag className={styles.tag} color={KEY_STATUS[key.status]?.color}>{t(...(KEY_STATUS[key.status]?.label ?? ['未知状态', 'Unknown']))}</Tag>
        </span>
      ),
    },
    {
      title: t('密钥', 'Key'),
      key: 'key',
      render: (_value, key) => (
        <span className={styles.keyCell}>
          <code>{withPrefix(key.key)}</code>
          <Tooltip title={t('复制完整密钥', 'Copy the full key')}>
            <Button type="text" size="small" icon={<CopyOutlined />} loading={busyId === key.id} aria-label={t(`复制「${key.name}」的完整密钥`, `Copy the full key of "${key.name}"`)} onClick={() => void copyKey(key)} />
          </Tooltip>
        </span>
      ),
    },
    {
      title: t('额度', 'Quota'),
      key: 'quota',
      render: (_value, key) => (
        <span className={styles.stack}>
          <span>{key.unlimited_quota ? t('不单独限制', 'No separate limit') : t(`剩余 ${formatQuota(key.remain_quota, format)}`, `${formatQuota(key.remain_quota, format)} left`)}</span>
          <span className={styles.muted}>{t('已用', 'Used')} {formatQuota(key.used_quota, format)}</span>
        </span>
      ),
    },
    {
      title: t('分组', 'Group'),
      dataIndex: 'group',
      render: (group: string) => group || <span className={styles.muted}>{t('未指定，请编辑', 'Not set — edit')}</span>,
    },
    {
      title: t('有效期', 'Expiry'),
      dataIndex: 'expired_time',
      render: (value: number) =>
        value === -1 ? (
          <span className={styles.muted}>{t('永不过期', 'Never expires')}</span>
        ) : (
          <span className={value * 1000 < Date.now() ? styles.expired : undefined}>{dayjs.unix(value).format('YYYY-MM-DD HH:mm')}</span>
        ),
    },
    {
      title: t('启用', 'Enabled'),
      key: 'status',
      width: 72,
      render: (_value, key) => (
        <Switch
          size="small"
          checked={key.status === 1}
          disabled={key.status === 3 || key.status === 4}
          loading={busyId === key.id}
          aria-label={key.status === 1 ? t(`停用「${key.name}」`, `Disable "${key.name}"`) : t(`启用「${key.name}」`, `Enable "${key.name}"`)}
          onChange={(checked) => void toggle(key, checked)}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 96,
      render: (_value, key) => (
        <span className={styles.actions}>
          <Tooltip title={t('编辑', 'Edit')}>
            <Button type="text" size="small" icon={<EditOutlined />} aria-label={t(`编辑「${key.name}」`, `Edit "${key.name}"`)} onClick={() => setEditing({ mode: 'edit', key })} />
          </Tooltip>
          <Popconfirm
            title={t('删除这个密钥？', 'Delete this key?')}
            description={t('使用它的程序会立即无法调用，删除后不能恢复。', 'Programs using it will fail immediately. This cannot be undone.')}
            okText={t('删除', 'Delete')}
            okButtonProps={{ danger: true }}
            cancelText={t('取消', 'Cancel')}
            onConfirm={() => remove(key)}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label={t(`删除「${key.name}」`, `Delete "${key.name}"`)} />
          </Popconfirm>
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHead
        title={t('API 密钥', 'API Keys')}
        description={t('用密钥调用接口。每个项目单独建一个，出问题时停用它不影响别的项目。', 'Call the API with keys. Create one per project so you can disable one without affecting the rest.')}
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing({ mode: 'create' })}>{t('创建密钥', 'Create key')}</Button>}
      />

      <section className={styles.endpoints} aria-label={t('接口地址', 'API endpoints')}>
        <div>
          <span className={styles.endpointLabel}>{t('OpenAI 兼容', 'OpenAI-compatible')}</span>
          <Typography.Text className={styles.endpoint} copyable={{ text: `${origin}/v1`, tooltips: [t('复制地址', 'Copy URL'), t('已复制', 'Copied')] }}>{origin}/v1</Typography.Text>
        </div>
        <div>
          <span className={styles.endpointLabel}>{t('Anthropic 兼容', 'Anthropic-compatible')}</span>
          <Typography.Text className={styles.endpoint} copyable={{ text: origin, tooltips: [t('复制地址', 'Copy URL'), t('已复制', 'Copied')] }}>{origin}</Typography.Text>
        </div>
      </section>

      {keys.isError ? (
        <Alert type="error" showIcon title={t('密钥列表暂时获取不到', 'Could not load the key list')} action={<Button size="small" onClick={() => void keys.refetch()}>{t('重试', 'Retry')}</Button>} />
      ) : (
        <Table<ApiKey>
          className={styles.table}
          rowKey="id"
          columns={columns}
          dataSource={keys.data?.items ?? []}
          loading={keys.isFetching}
          scroll={{ x: 900 }}
          locale={{ emptyText: t('还没有密钥。点右上角「创建密钥」，拿到后就能开始调用。', 'No keys yet. Click "Create key" above to get started.') }}
          pagination={{
            current: page,
            pageSize,
            total: keys.data?.total ?? 0,
            hideOnSinglePage: true,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            onChange: (nextPage, nextSize) => {
              setPage(nextSize === pageSize ? nextPage : 1)
              setPageSize(nextSize)
            },
          }}
        />
      )}

      <KeyFormModal
        open={editing !== null}
        initial={editing?.mode === 'edit' ? fromKey(editing.key, format) : undefined}
        format={format}
        onCancel={() => setEditing(null)}
        onSubmit={handleSubmit}
      />
      <KeyRevealModal value={revealed} onClose={() => setRevealed(null)} />
    </div>
  )
}
