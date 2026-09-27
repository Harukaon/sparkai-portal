import { Alert, Button, Form, Input } from 'antd'
import { useState } from 'react'

import { loginWithPassword } from '@/features/auth/api'
import { Turnstile } from '@/features/auth/components/Turnstile'
import { isLoginChallenge } from '@/features/auth/types'
import type { AuthBundle, LoginChallenge, SystemStatus } from '@/features/auth/types'
import { errorMessage } from '@/shared/api/client'

interface LoginValues {
  username: string
  password: string
}

interface PasswordLoginFormProps {
  status: SystemStatus
  /** 注册成功跳过来时，帮用户把用户名填好 */
  initialUsername?: string
  onAuthenticated: (bundle: AuthBundle) => void
  /** 账号开了两步验证：交给上层切到验证步骤 */
  onChallenge: (challenge: LoginChallenge) => void
}

export function PasswordLoginForm({
  status,
  initialUsername,
  onAuthenticated,
  onChallenge,
}: PasswordLoginFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileKey, setTurnstileKey] = useState(0)

  const turnstileSiteKey = status.turnstile_check ? status.turnstile_site_key : undefined

  async function handleFinish(values: LoginValues) {
    if (turnstileSiteKey && !turnstileToken) {
      setError('请先完成下方的人机验证')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const result = await loginWithPassword({
        username: values.username.trim(),
        password: values.password,
        turnstile: turnstileToken,
        encrypt: status.password_login_encryption_enabled,
      })
      if (isLoginChallenge(result)) {
        onChallenge(result)
      } else {
        onAuthenticated(result)
      }
    } catch (caught: unknown) {
      setError(errorMessage(caught, '登录失败，请稍后重试'))
      // 人机验证令牌只能用一次，失败后换一个新的
      if (turnstileSiteKey) {
        setTurnstileToken('')
        setTurnstileKey((key) => key + 1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form<LoginValues>
      layout="vertical"
      size="large"
      requiredMark={false}
      initialValues={{ username: initialUsername ?? '' }}
      onFinish={handleFinish}
      onValuesChange={() => setError(null)}
    >
      <Form.Item
        name="username"
        label="用户名或邮箱"
        rules={[{ required: true, whitespace: true, message: '请输入用户名或邮箱' }]}
      >
        <Input autoComplete="username" placeholder="用户名或邮箱" autoFocus={!initialUsername} />
      </Form.Item>

      <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
        <Input.Password
          autoComplete="current-password"
          placeholder="密码"
          autoFocus={Boolean(initialUsername)}
        />
      </Form.Item>

      {turnstileSiteKey ? (
        <Form.Item>
          <Turnstile key={turnstileKey} siteKey={turnstileSiteKey} onToken={setTurnstileToken} />
        </Form.Item>
      ) : null}

      {error ? (
        <Form.Item>
          <Alert type="error" showIcon title={error} />
        </Form.Item>
      ) : null}

      <Button type="primary" htmlType="submit" block loading={submitting}>
        登录
      </Button>
    </Form>
  )
}
