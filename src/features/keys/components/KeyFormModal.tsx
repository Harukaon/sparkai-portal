import { useQuery } from '@tanstack/react-query'
import { Alert, DatePicker, Form, Input, InputNumber, Modal, Radio, Select, Switch } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'

import { useAuthStore } from '@/features/auth/auth-store'
import type { QuotaFormat } from '@/features/console/quota'
import { fetchUsableGroups, fetchUserModels } from '@/features/keys/api'
import type { KeyInput } from '@/features/keys/api'
import { EMPTY_KEY_FORM, nameBytes, toKeyInput } from '@/features/keys/form'
import type { KeyFormValues } from '@/features/keys/form'
import { errorMessage } from '@/shared/api/client'

import styles from './KeyFormModal.module.css'

interface Props {
  open: boolean
  /** 传入即为编辑 */
  initial?: KeyFormValues
  format: QuotaFormat
  onCancel: () => void
  onSubmit: (input: KeyInput) => Promise<void>
}

export function KeyFormModal({ open, initial, format, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<KeyFormValues>()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const userId = useAuthStore((state) => state.user?.id)
  const quotaMode = Form.useWatch('quotaMode', form)
  const expiryMode = Form.useWatch('expiryMode', form)
  const limitModels = Form.useWatch('limitModels', form)

  const groups = useQuery({ queryKey: ['usable-groups', userId], queryFn: fetchUsableGroups, enabled: open })
  const models = useQuery({ queryKey: ['user-models', userId], queryFn: fetchUserModels, enabled: open })

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
      setError(errorMessage(caught, '保存失败，请稍后重试'))
    } finally {
      setSaving(false)
    }
  }

  const unitLabel = format.unit === 'TOKENS' ? '额度' : format.symbol

  return (
    <Modal
      open={open}
      title={initial ? '编辑密钥' : '创建密钥'}
      okText={initial ? '保存修改' : '创建密钥'}
      cancelText="取消"
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
        initialValues={initial ?? EMPTY_KEY_FORM}
      >
        <Form.Item
          name="name"
          label="名称"
          extra="方便区分用途，例如「生产环境」「本地测试」。"
          rules={[
            { required: true, whitespace: true, message: '请填写名称' },
            {
              validator: (_rule, value: string | undefined) =>
                !value || nameBytes(value.trim()) <= 50
                  ? Promise.resolve()
                  : Promise.reject(new Error('名称太长了：最多 50 个字节，约 16 个汉字')),
            },
          ]}
        >
          <Input placeholder="例如：生产环境" autoFocus />
        </Form.Item>

        <Form.Item name="quotaMode" label="额度">
          <Radio.Group
            options={[
              { value: 'unlimited', label: '不单独限制（用账号余额）' },
              { value: 'limited', label: '设置上限' },
            ]}
          />
        </Form.Item>
        {quotaMode === 'limited' ? (
          <Form.Item
            name="amount"
            label={`这个密钥最多能花（${unitLabel}）`}
            rules={[{ required: true, message: '请填写额度上限' }, { type: 'number', min: 0.000001, message: '额度上限要大于 0' }]}
          >
            <InputNumber className={styles.full} min={0} precision={format.unit === 'TOKENS' ? 0 : undefined} placeholder="例如 10" />
          </Form.Item>
        ) : null}

        <Form.Item name="expiryMode" label="有效期">
          <Radio.Group options={[{ value: 'never', label: '永不过期' }, { value: 'date', label: '到期自动失效' }]} />
        </Form.Item>
        {expiryMode === 'date' ? (
          <Form.Item
            name="expiresAt"
            label="失效时间"
            rules={[
              { required: true, message: '请选择失效时间' },
              {
                validator: (_rule, value?: dayjs.Dayjs) =>
                  !value || value.isAfter(dayjs()) ? Promise.resolve() : Promise.reject(new Error('失效时间要晚于现在')),
              },
            ]}
          >
            <DatePicker className={styles.full} showTime={{ format: 'HH:mm' }} format="YYYY-MM-DD HH:mm" />
          </Form.Item>
        ) : null}

        <Form.Item name="group" label="计费分组" extra="决定这个密钥按哪个分组的价格计费。">
          <Select
            loading={groups.isPending}
            options={[
              { value: '', label: '跟随账号分组' },
              ...Object.entries(groups.data ?? {}).map(([name, group]) => ({
                value: name,
                label: `${name}${group.desc ? ` · ${group.desc}` : ''}${typeof group.ratio === 'number' ? ` · ${group.ratio} 倍` : ''}`,
              })),
            ]}
          />
        </Form.Item>

        <Form.Item name="limitModels" label="只允许调用指定模型" valuePropName="checked">
          <Switch />
        </Form.Item>
        {limitModels ? (
          <Form.Item name="models" rules={[{ required: true, type: 'array', min: 1, message: '至少选择一个模型' }]}>
            <Select
              mode="multiple"
              loading={models.isPending}
              placeholder="选择允许调用的模型"
              options={(models.data ?? []).map((name) => ({ value: name, label: name }))}
              notFoundContent="当前分组没有可用模型"
            />
          </Form.Item>
        ) : null}

        <Form.Item name="allowIps" label="IP 白名单（可选）" extra="每行一个 IP 或网段；留空表示不限制来源。">
          <Input.TextArea rows={2} placeholder={'例如：\n203.0.113.10'} />
        </Form.Item>

        {error ? <Alert type="error" showIcon title={error} /> : null}
      </Form>
    </Modal>
  )
}
