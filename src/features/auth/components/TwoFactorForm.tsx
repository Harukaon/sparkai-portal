import { Alert, Button, Form, Input } from 'antd'
import { useState } from 'react'

import { loginWith2FA } from '@/features/auth/api'
import type { AuthBundle, LoginChallenge } from '@/features/auth/types'
import { errorMessage } from '@/shared/api/client'

interface TwoFactorFormProps {
  challenge: LoginChallenge
  onAuthenticated: (bundle: AuthBundle) => void
  /** 放弃这次验证，回到账号密码 */
  onCancel: () => void
}

/** 账号开了两步验证时的第二步：输入验证器 App 的动态码或备用码 */
export function TwoFactorForm({ challenge, onAuthenticated, onCancel }: TwoFactorFormProps) {
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supportsCode = challenge.methods.some((item) => item.method === '2fa' && item.available)

  if (!supportsCode) {
    return (
      <>
        <Alert
          type="info"
          showIcon
          title="这个账号需要用通行密钥或第三方账号完成验证"
          description="这两种验证方式的网页端还在接入中，可以先在账号设置里开启两步验证码。"
        />
        <Button block onClick={onCancel}>
          返回
        </Button>
      </>
    )
  }

  async function handleFinish() {
    const trimmed = code.trim()
    if (!trimmed) {
      setError('请输入验证码')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      onAuthenticated(await loginWith2FA(challenge.flow_token, trimmed))
    } catch (caught: unknown) {
      setError(errorMessage(caught, '验证失败，请重试'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form layout="vertical" size="large" requiredMark={false} onFinish={handleFinish}>
      <Form.Item label="验证码" extra="打开验证器 App 输入 6 位动态码；手机不在身边时，也可以输入一个备用码。">
        <Input
          value={code}
          onChange={(event) => {
            setCode(event.target.value)
            setError(null)
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="6 位动态码或备用码"
          maxLength={32}
          autoFocus
        />
      </Form.Item>

      {error ? (
        <Form.Item>
          <Alert type="error" showIcon title={error} />
        </Form.Item>
      ) : null}

      <Button type="primary" htmlType="submit" block loading={submitting}>
        验证并登录
      </Button>
      <Button type="link" block onClick={onCancel}>
        换个账号登录
      </Button>
    </Form>
  )
}
