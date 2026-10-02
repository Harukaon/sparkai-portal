import { useQuery } from '@tanstack/react-query'
import { Alert, DatePicker, Form, Input, InputNumber, Modal, Radio, Select, Switch } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'

import { useAuthStore } from '@/features/auth/auth-store'
import type { QuotaFormat } from '@/features/console/quota'
import { fetchUsableGroups, fetchUserModels } from '@/features/keys/api'
import type { KeyInput } from '@/features/keys/api'
import { EMPTY_KEY_FORM, nameBytes, toKeyInput } from '@/features/keys/form'
import type { KeyFormValues } from '@/features/keys/form'
import { errorMessage } from '@/shared/api/client'
import { useT } from '@/shared/i18n'

import styles from './KeyFormModal.module.css'

/** 新建密钥默认的计费分组：自动按模型路由到对应分组 */
const DEFAULT_NEW_KEY_GROUP = 'auto'

interface Props {
  open: boolean
  /** 传入即为编辑 */
  initial?: KeyFormValues
  format: QuotaFormat
  onCancel: () => void
  onSubmit: (input: KeyInput) => Promise<void>
}

export function KeyFormModal({ open, initial, format, onCancel, onSubmit }: Props) {
  const t = useT()
  const [form] = Form.useForm<KeyFormValues>()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const userId = useAuthStore((state) => state.user?.id)
  const quotaMode = Form.useWatch('quotaMode', form)
  const expiryMode = Form.useWatch('expiryMode', form)
  const limitModels = Form.useWatch('limitModels', form)

  const groups = useQuery({
    queryKey: ['usable-groups', userId],
    queryFn: async () => {
      const all = await fetchUsableGroups()
      // 后端会把用户自己的账号分组（default）固定补进可选列表并标成「用户分组」，
      // 它不是站长开放的计费分组，也没有渠道，不给用户选
      return Object.fromEntries(Object.entries(all).filter(([, group]) => group.desc !== '用户分组'))
    },
    enabled: open,
  })
  const models = useQuery({ queryKey: ['user-models', userId], queryFn: fetchUserModels, enabled: open })

  // 新建密钥默认选「自动选择」；旧密钥里留空或已不可用的分组（含 default），打开时清掉，逼着重新选
  useEffect(() => {
    if (!open || !groups.data) return
    const current = form.getFieldValue('group') as string | undefined
    if (current && !(current in groups.data)) form.setFieldValue('group', undefined)
  }, [open, groups.data, form])

  async function handleOk() {
    let values: KeyFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSubmit(toKeyInput({ ...EMPTY_KEY_FORM, ...values }, format))
    } catch (caught: unknown) {
      setError(errorMessage(caught, t('保存失败，请稍后重试', 'Save failed — try again later')))
    } finally {
      setSaving(false)
    }
  }

  const unitLabel = format.unit === 'TOKENS' ? t('额度', 'Quota') : format.symbol

  return (
    <Modal
      open={open}
      title={initial ? t('编辑密钥', 'Edit key') : t('创建密钥', 'Create key')}
      okText={initial ? t('保存修改', 'Save changes') : t('创建密钥', 'Create key')}
      cancelText={t('取消', 'Cancel')}
      confirmLoading={saving}
      onOk={() => void handleOk()}
      onCancel={onCancel}
      afterClose={() => setError(null)}
      destroyOnHidden
      width={560}
    >
      <Form<KeyFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        className={styles.form}
        preserve={false}
        initialValues={{ ...(initial ?? EMPTY_KEY_FORM), group: initial ? initial.group || undefined : DEFAULT_NEW_KEY_GROUP } as Partial<KeyFormValues>}
      >
        <Form.Item
          name="name"
          label={t('名称', 'Name')}
          extra={t('方便区分用途，例如「生产环境」「本地测试」。', 'Helps tell projects apart, e.g. "production" or "local testing".')}
          rules={[
            { required: true, whitespace: true, message: t('请填写名称', 'Enter a name') },
            {
              validator: (_rule, value: string | undefined) =>
                !value || nameBytes(value.trim()) <= 50
                  ? Promise.resolve()
                  : Promise.reject(new Error(t('名称太长了：最多 50 个字节，约 16 个汉字', 'Name too long: up to 50 bytes (~16 CJK characters)'))),
            },
          ]}
        >
          <Input placeholder={t('例如：生产环境', 'e.g. Production')} autoFocus />
        </Form.Item>

        <Form.Item name="quotaMode" label={t('额度', 'Quota')}>
          <Radio.Group
            options={[
              { value: 'unlimited', label: t('不单独限制（用账号余额）', 'No separate limit (uses account balance)') },
              { value: 'limited', label: t('设置上限', 'Set a cap') },
            ]}
          />
        </Form.Item>
        {quotaMode === 'limited' ? (
          <Form.Item
            name="amount"
            label={t(`这个密钥最多能花（${unitLabel}）`, `Max spend for this key (${unitLabel})`)}
            rules={[{ required: true, message: t('请填写额度上限', 'Enter the cap') }, { type: 'number', min: 0.000001, message: t('额度上限要大于 0', 'The cap must be greater than 0') }]}
          >
            <InputNumber className={styles.full} min={0} precision={format.unit === 'TOKENS' ? 0 : undefined} placeholder={t('例如 10', 'e.g. 10')} />
          </Form.Item>
        ) : null}

        <Form.Item name="expiryMode" label={t('有效期', 'Expiry')}>
          <Radio.Group options={[{ value: 'never', label: t('永不过期', 'Never expires') }, { value: 'date', label: t('到期自动失效', 'Expires on a date') }]} />
        </Form.Item>
        {expiryMode === 'date' ? (
          <Form.Item
            name="expiresAt"
            label={t('失效时间', 'Expiry time')}
            rules={[
              { required: true, message: t('请选择失效时间', 'Pick the expiry time') },
              {
                validator: (_rule, value?: dayjs.Dayjs) =>
                  !value || value.isAfter(dayjs()) ? Promise.resolve() : Promise.reject(new Error(t('失效时间要晚于现在', 'Expiry must be in the future'))),
              },
            ]}
          >
            <DatePicker className={styles.full} showTime={{ format: 'HH:mm' }} format="YYYY-MM-DD HH:mm" />
          </Form.Item>
        ) : null}

        <Form.Item
          name="group"
          label={t('计费分组', 'Billing group')}
          extra={t('决定这个密钥走哪个分组的渠道、按哪个分组的价格计费。', 'Which group of channels this key uses, and which group price it is billed at.')}
          rules={[{ required: true, message: t('请选择计费分组', 'Choose a billing group') }]}
        >
          <Select
            loading={groups.isPending}
            placeholder={t('请选择计费分组', 'Choose a billing group')}
            options={Object.entries(groups.data ?? {}).map(([name, group]) => ({
              value: name,
              label: `${name}${group.desc ? ` · ${group.desc}` : ''}${typeof group.ratio === 'number' ? ` · ${t(`${group.ratio} 倍`, `×${group.ratio}`)}` : ''}`,
            }))}
          />
        </Form.Item>

        <Form.Item name="limitModels" label={t('只允许调用指定模型', 'Restrict to specific models')} valuePropName="checked">
          <Switch />
        </Form.Item>
        {limitModels ? (
          <Form.Item name="models" rules={[{ required: true, type: 'array', min: 1, message: t('至少选择一个模型', 'Pick at least one model') }]}>
            <Select
              mode="multiple"
              loading={models.isPending}
              placeholder={t('选择允许调用的模型', 'Choose allowed models')}
              options={(models.data ?? []).map((name) => ({ value: name, label: name }))}
              notFoundContent={t('当前分组没有可用模型', 'No models in this group')}
            />
          </Form.Item>
        ) : null}

        <Form.Item name="allowIps" label={t('IP 白名单（可选）', 'IP allowlist (optional)')} extra={t('每行一个 IP 或网段；留空表示不限制来源。', 'One IP or CIDR per line; empty means no restriction.')}>
          <Input.TextArea rows={2} placeholder={t('例如：\n203.0.113.10', 'e.g.\n203.0.113.10')} />
        </Form.Item>

        {error ? <Alert type="error" showIcon title={error} /> : null}
      </Form>
    </Modal>
  )
}
