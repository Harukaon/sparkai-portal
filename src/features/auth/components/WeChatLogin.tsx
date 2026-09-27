import { Alert, Button, Input, Modal } from 'antd'
import { useState } from 'react'

import { isLoginChallenge } from '@/features/auth/types'
import type { AuthBundle, LoginChallenge, LoginResult, SystemStatus } from '@/features/auth/types'
import { apiGet, errorMessage } from '@/shared/api/client'

import styles from './WeChatLogin.module.css'

interface Props {
  status: SystemStatus
  onAuthenticated: (bundle: AuthBundle) => void
  onChallenge: (challenge: LoginChallenge) => void
}

/** New API 的微信登录是先扫码取得口令，再由用户填写口令；不是 OAuth 网页重定向。 */
export function WeChatLogin({ status, onAuthenticated, onChallenge }: Props) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!status.wechat_login) return null
  const qr = status.wechat_qrcode || status.wechat_qr_code || status.wechat_qrcode_image_url || status.wechat_qr_code_image_url

  async function submit() {
    if (!code.trim()) { setError('请输入扫码后收到的验证码'); return }
    setBusy(true)
    setError(null)
    try {
      const result = await apiGet<LoginResult>('/api/oauth/wechat', { code: code.trim() }, { skipAuth: true })
      setOpen(false)
      setCode('')
      if (isLoginChallenge(result)) onChallenge(result)
      else onAuthenticated(result)
    } catch (caught: unknown) {
      setError(errorMessage(caught, '微信验证失败，请重新获取验证码'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button block onClick={() => setOpen(true)}>使用微信登录</Button>
      <Modal
        open={open}
        title="微信扫码登录"
        onCancel={() => { setOpen(false); setCode(''); setError(null) }}
        onOk={() => void submit()}
        okText="验证并登录"
        okButtonProps={{ loading: busy }}
        destroyOnHidden
      >
        <div className={styles.body}>
          {qr && /^https?:\/\//.test(qr) ? <img className={styles.qr} src={qr} alt="微信扫码二维码" /> : null}
          <p>扫码关注后，将收到的验证码填在下方。</p>
          <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="微信验证码" autoComplete="one-time-code" onPressEnter={() => void submit()} />
          {error ? <Alert type="error" showIcon title={error} /> : null}
        </div>
      </Modal>
    </>
  )
}
