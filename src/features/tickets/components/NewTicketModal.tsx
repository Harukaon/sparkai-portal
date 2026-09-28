import { App as AntdApp, Form, Input, Modal, Select } from 'antd'
import type { UploadFile } from 'antd'
import { useState } from 'react'

import { createTicket } from '@/features/tickets/api'
import type { Ticket, TicketCategory } from '@/features/tickets/api'
import { ImagePicker } from '@/features/tickets/components/ImagePicker'
import { CATEGORY_LABELS, CONTENT_MAX, TITLE_MAX, isUploading, uploadedIds } from '@/features/tickets/labels'
import { errorMessage } from '@/shared/api/client'
import { useT } from '@/shared/i18n'

interface FormValues {
  category: TicketCategory
  title: string
  content: string
}

interface NewTicketModalProps {
  open: boolean
  onClose: () => void
  onCreated: (ticket: Ticket) => void
}

/** 提交工单：类型、标题、描述、截图，就这些 */
export function NewTicketModal({ open, onClose, onCreated }: NewTicketModalProps) {
  const t = useT()
  const { message } = AntdApp.useApp()
  const [form] = Form.useForm<FormValues>()
  const [files, setFiles] = useState<UploadFile[]>([])
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    form.resetFields()
    setFiles([])
  }

  async function submit() {
    const values = await form.validateFields()
    if (isUploading(files)) {
      message.warning(t('图片还在上传，请稍等', 'Images are still uploading'))
      return
    }
    setSubmitting(true)
    try {
      const ticket = await createTicket({ ...values, title: values.title.trim(), content: values.content.trim(), images: uploadedIds(files) })
      message.success(t('工单已提交，我们会尽快回复', 'Ticket submitted — we will reply soon'))
      reset()
      onCreated(ticket)
    } catch (error: unknown) {
      message.error(errorMessage(error, t('提交失败，请稍后重试', 'Submission failed — please try again')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={t('提交工单', 'New ticket')}
      okText={t('提交', 'Submit')}
      cancelText={t('取消', 'Cancel')}
      confirmLoading={submitting}
      onOk={() => void submit()}
      onCancel={onClose}
      destroyOnHidden={false}
      width={600}
    >
      <Form<FormValues> form={form} layout="vertical" requiredMark={false} initialValues={{ category: 'other' }}>
        <Form.Item name="category" label={t('问题类型', 'Category')} rules={[{ required: true }]}>
          <Select
            options={(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map((value) => ({
              value,
              label: t(...CATEGORY_LABELS[value]),
            }))}
          />
        </Form.Item>
        <Form.Item
          name="title"
          label={t('标题', 'Title')}
          rules={[{ required: true, whitespace: true, message: t('请填写标题', 'Please enter a title') }]}
        >
          <Input maxLength={TITLE_MAX} showCount placeholder={t('一句话说明问题，例如：充值成功但余额没变', 'One line, e.g. "Paid but balance did not change"')} />
        </Form.Item>
        <Form.Item
          name="content"
          label={t('问题描述', 'Description')}
          rules={[{ required: true, whitespace: true, message: t('请填写问题描述', 'Please describe the issue') }]}
          extra={t('方便的话写上订单号、请求时间、模型名、报错原文，处理会快很多。', 'Order number, request time, model and the exact error message help us resolve it faster.')}
        >
          <Input.TextArea rows={6} maxLength={CONTENT_MAX} showCount />
        </Form.Item>
        <Form.Item label={t('截图（选填，每张不超过 1MB）', 'Screenshots (optional, up to 1MB each)')}>
          <ImagePicker value={files} onChange={setFiles} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
