import { Alert, Modal, Typography } from 'antd'

import styles from './KeyRevealModal.module.css'

interface Props {
  /** 有值即打开 */
  value: { title: string; key: string } | null
  onClose: () => void
}

/** 展示完整密钥：新建后自动弹出，或复制失败时让用户手动复制。 */
export function KeyRevealModal({ value, onClose }: Props) {
  return (
    <Modal open={Boolean(value)} title={value?.title} onCancel={onClose} onOk={onClose} okText="我已保存" cancelButtonProps={{ style: { display: 'none' } }} destroyOnHidden>
      <Typography.Paragraph className={styles.key} copyable={{ text: value?.key ?? '', tooltips: ['复制', '已复制'] }}>
        {value?.key}
      </Typography.Paragraph>
      <Alert
        type="warning"
        showIcon
        title="请妥善保管"
        description="拿到密钥的人可以直接消耗你的余额。不要发给别人，也不要写进网页或手机 App 的前端代码里。"
      />
    </Modal>
  )
}
