import { App as AntdApp, Alert, Button, Form, Input, Space } from 'antd'
import { useState } from 'react'

import { getAffiliateCode } from '@/features/auth/affiliate'
import { register, sendEmailVerificationCode } from '@/features/auth/api'
import { Turnstile } from '@/features/auth/components/Turnstile'
import { useCountdown } from '@/features/auth/hooks'
import type { SystemStatus } from '@/features/auth/types'
import { errorMessage } from '@/shared/api/client'

/** 与 New API 后端校验保持一致 */
const USERNAME_MAX = 20
const PASSWORD_MIN = 8
const PASSWORD_MAX = 128
const EMAIL_MAX = 50
const RESEND_SECONDS = 60

interface RegisterValues {
  username: string
  password: string
  confirm: string
  email?: string
  verification_code?: string
}

interface RegisterFormProps {
  status: SystemStatus
  /** 注册成功后只通知用户名，不把明文密码留在页面状态里 */
  onRegistered: (username: string) => void
}

export function RegisterForm({ status, onRegistered }: RegisterFormProps) {
  const { message } = AntdApp.useApp()
  const [form] = Form.useForm<RegisterValues>()
  const [submitting, setSubmitting] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileKey, setTurnstileKey] = useState(0)
  const countdown = useCountdown()

  const needEmail = status.email_verification
  const turnstileSiteKey = status.turnstile_check ? status.turnstile_site_key : undefined

  /** 人机验证令牌是一次性的：发验证码、提交注册各消耗一次 */
  function renewTurnstile() {
    if (turnstileSiteKey) {
      setTurnstileToken('')
      setTurnstileKey((key) => key + 1)
    }
  }

  function turnstileMissing(): boolean {
    if (turnstileSiteKey && !turnstileToken) {
      setError('请先完成下方的人机验证')
      return true
    }
    return false
  }

  async function handleSendCode() {
    try {
      await form.validateFields(['email'])
    } catch {
      return
    }
    if (turnstileMissing()) return

    setSendingCode(true)
    setError(null)
    try {
      await sendEmailVerificationCode(form.getFieldValue('email').trim(), turnstileToken)
      message.success('验证码已发送，请到邮箱查收')
      countdown.start(RESEND_SECONDS)
    } catch (caught: unknown) {
      setError(errorMessage(caught, '验证码发送失败，请稍后重试'))
    } finally {
      setSendingCode(false)
      renewTurnstile()
    }
  }

  async function handleFinish(values: RegisterValues) {
    if (turnstileMissing()) return

    setSubmitting(true)
    setError(null)
    const username = values.username.trim()
    try {
      await register({
        username,
        password: values.password,
        email: needEmail ? values.email?.trim() : undefined,
        verification_code: needEmail ? values.verification_code?.trim() : undefined,
        aff_code: getAffiliateCode() || undefined,
        turnstile: turnstileToken,
      })
      onRegistered(username)
    } catch (caught: unknown) {
      setError(errorMessage(caught, '注册失败，请稍后重试'))
      renewTurnstile()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form<RegisterValues>
      form={form}
      layout="vertical"
      size="large"
      requiredMark={false}
      onFinish={handleFinish}
      onValuesChange={() => setError(null)}
    >
      <Form.Item
        name="username"
        label="用户名"
        rules={[
          { required: true, whitespace: true, message: '请输入用户名' },
          { max: USERNAME_MAX, message: `用户名最多 ${USERNAME_MAX} 个字符` },
        ]}
      >
        <Input autoComplete="username" placeholder={`最多 ${USERNAME_MAX} 个字符`} autoFocus />
      </Form.Item>

      <Form.Item
        name="password"
        label="密码"
        rules={[
          { required: true, message: '请输入密码' },
          { min: PASSWORD_MIN, message: `密码至少 ${PASSWORD_MIN} 位` },
          { max: PASSWORD_MAX, message: `密码最多 ${PASSWORD_MAX} 位` },
        ]}
      >
        <Input.Password autoComplete="new-password" placeholder={`至少 ${PASSWORD_MIN} 位`} />
      </Form.Item>

      <Form.Item
        name="confirm"
        label="确认密码"
        dependencies={['password']}
        rules={[
          { required: true, message: '请再输入一次密码' },
          ({ getFieldValue }) => ({
            validator(_rule, value: string | undefined) {
              if (!value || getFieldValue('password') === value) return Promise.resolve()
              return Promise.reject(new Error('两次输入的密码不一致'))
            },
          }),
        ]}
      >
        <Input.Password autoComplete="new-password" placeholder="再输入一次" />
      </Form.Item>

      {needEmail ? (
        <>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, whitespace: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不对' },
              { max: EMAIL_MAX, message: `邮箱最多 ${EMAIL_MAX} 个字符` },
            ]}
          >
            <Input autoComplete="email" placeholder="用于接收验证码和找回密码" />
          </Form.Item>

          <Form.Item label="邮箱验证码" required>
            <Space.Compact block>
              <Form.Item
                name="verification_code"
                noStyle
                rules={[{ required: true, whitespace: true, message: '请输入邮箱验证码' }]}
              >
                <Input autoComplete="one-time-code" placeholder="6 位验证码" />
              </Form.Item>
              <Button
                onClick={handleSendCode}
                loading={sendingCode}
                disabled={countdown.secondsLeft > 0}
              >
                {countdown.secondsLeft > 0 ? `${countdown.secondsLeft} 秒后重发` : '发送验证码'}
              </Button>
            </Space.Compact>
          </Form.Item>
        </>
      ) : null}

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
        创建账号
      </Button>
    </Form>
  )
}
