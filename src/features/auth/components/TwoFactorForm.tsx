import { Alert, Button, Form, Input } from 'antd'
import { useState } from 'react'

import { loginWith2FA } from '@/features/auth/api'
import { verifyPasskeyChallenge } from '@/features/auth/passkey'
import type { AuthBundle, LoginChallenge } from '@/features/auth/types'
import { errorMessage } from '@/shared/api/client'
import { useT } from '@/shared/i18n'

interface TwoFactorFormProps {
  challenge: LoginChallenge
  onAuthenticated: (bundle: AuthBundle) => void
  /** 放弃这次验证，回到账号密码 */
  onCancel: () => void
}

/** 账号开了两步验证时的第二步：输入验证器 App 的动态码或备用码 */
export function TwoFactorForm({ challenge, onAuthenticated, onCancel }: TwoFactorFormProps) {
  const t = useT()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [passkeyBusy, setPasskeyBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supportsCode = challenge.methods.some((item) => item.method === '2fa' && item.available)
  const supportsPasskey = challenge.methods.some((item) => item.method === 'passkey' && item.available)

  async function handlePasskey() {
    setPasskeyBusy(true)
    setError(null)
    try {
      onAuthenticated(await verifyPasskeyChallenge(challenge.flow_token))
    } catch (caught: unknown) {
      setError(errorMessage(caught, t('通行密钥验证失败', 'Passkey verification failed')))
    } finally {
      setPasskeyBusy(false)
    }
  }

  if (!supportsCode && !supportsPasskey) {
    return (
      <>
        <Alert
          type="info"
          showIcon
          title={t('这个账号需要用通行密钥或第三方账号完成验证', 'This account requires a passkey or a third-party sign-in')}
          description={t('当前验证方式暂不可用，请换一个账号或联系管理员。', 'That method is unavailable right now — switch accounts or contact the administrator.')}
        />
        <Button block onClick={onCancel}>
          {t('返回', 'Back')}
        </Button>
      </>
    )
  }

  async function handleFinish() {
    const trimmed = code.trim()
    if (!trimmed) {
      setError(t('请输入验证码', 'Enter the code'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      onAuthenticated(await loginWith2FA(challenge.flow_token, trimmed))
    } catch (caught: unknown) {
      setError(errorMessage(caught, t('验证失败，请重试', 'Verification failed — try again')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form layout="vertical" size="large" requiredMark={false} onFinish={handleFinish}>
      {supportsCode ? <Form.Item label={t('验证码', 'Code')} extra={t('打开验证器 App 输入 6 位动态码；手机不在身边时，也可以输入一个备用码。', 'Open your authenticator app for the 6-digit code; use a backup code if the phone is not at hand.')}>
        <Input
          value={code}
          onChange={(event) => {
            setCode(event.target.value)
            setError(null)
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder={t('6 位动态码或备用码', '6-digit code or backup code')}
          maxLength={32}
          autoFocus
        />
      </Form.Item> : null}

      {error ? (
        <Form.Item>
          <Alert type="error" showIcon title={error} />
        </Form.Item>
      ) : null}

      {supportsCode ? (
        <Button type="primary" htmlType="submit" block loading={submitting}>
          {t('验证并登录', 'Verify and sign in')}
        </Button>
      ) : null}
      {supportsPasskey ? (
        <Button block loading={passkeyBusy} onClick={() => void handlePasskey()}>
          {t('使用通行密钥验证', 'Verify with a passkey')}
        </Button>
      ) : null}
      <Button type="link" block onClick={onCancel}>
        {t('换个账号登录', 'Switch account')}
      </Button>
    </Form>
  )
}
