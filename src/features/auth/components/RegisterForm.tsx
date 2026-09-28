import { App as AntdApp, Alert, Button, Form, Input, Space } from 'antd'
import { useState } from 'react'

import { getAffiliateCode } from '@/features/auth/affiliate'
import { register, sendEmailVerificationCode } from '@/features/auth/api'
import { Turnstile } from '@/features/auth/components/Turnstile'
import { useCountdown } from '@/features/auth/hooks'
import type { SystemStatus } from '@/features/auth/types'
import { errorMessage } from '@/shared/api/client'
import { useT } from '@/shared/i18n'

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
  const t = useT()
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
      setError(t('请先完成下方的人机验证', 'Please complete the human check below first'))
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
      message.success(t('验证码已发送，请到邮箱查收', 'Code sent — check your inbox'))
      countdown.start(RESEND_SECONDS)
    } catch (caught: unknown) {
      setError(errorMessage(caught, t('验证码发送失败，请稍后重试', 'Could not send the code — try again later')))
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
      setError(errorMessage(caught, t('注册失败，请稍后重试', 'Sign-up failed — try again later')))
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
        label={t('用户名', 'Username')}
        rules={[
          { required: true, whitespace: true, message: t('请输入用户名', 'Enter a username') },
          { max: USERNAME_MAX, message: t(`用户名最多 ${USERNAME_MAX} 个字符`, `Username is at most ${USERNAME_MAX} characters`) },
        ]}
      >
        <Input autoComplete="username" placeholder={t(`最多 ${USERNAME_MAX} 个字符`, `Up to ${USERNAME_MAX} characters`)} autoFocus />
      </Form.Item>

      <Form.Item
        name="password"
        label={t('密码', 'Password')}
        rules={[
          { required: true, message: t('请输入密码', 'Enter a password') },
          { min: PASSWORD_MIN, message: t(`密码至少 ${PASSWORD_MIN} 位`, `Password needs at least ${PASSWORD_MIN} characters`) },
          { max: PASSWORD_MAX, message: t(`密码最多 ${PASSWORD_MAX} 位`, `Password is at most ${PASSWORD_MAX} characters`) },
        ]}
      >
        <Input.Password autoComplete="new-password" placeholder={t(`至少 ${PASSWORD_MIN} 位`, `At least ${PASSWORD_MIN} characters`)} />
      </Form.Item>

      <Form.Item
        name="confirm"
        label={t('确认密码', 'Confirm password')}
        dependencies={['password']}
        rules={[
          { required: true, message: t('请再输入一次密码', 'Enter the password again') },
          ({ getFieldValue }) => ({
            validator(_rule, value: string | undefined) {
              if (!value || getFieldValue('password') === value) return Promise.resolve()
              return Promise.reject(new Error(t('两次输入的密码不一致', 'Passwords do not match')))
            },
          }),
        ]}
      >
        <Input.Password autoComplete="new-password" placeholder={t('再输入一次', 'Repeat password')} />
      </Form.Item>

      {needEmail ? (
        <>
          <Form.Item
            name="email"
            label={t('邮箱', 'Email')}
            rules={[
              { required: true, whitespace: true, message: t('请输入邮箱', 'Enter your email') },
              { type: 'email', message: t('邮箱格式不对', 'That does not look like a valid email') },
              { max: EMAIL_MAX, message: t(`邮箱最多 ${EMAIL_MAX} 个字符`, `Email is at most ${EMAIL_MAX} characters`) },
            ]}
          >
            <Input autoComplete="email" placeholder={t('用于接收验证码和找回密码', 'For codes and password recovery')} />
          </Form.Item>

          <Form.Item label={t('邮箱验证码', 'Email code')} required>
            <Space.Compact block>
              <Form.Item
                name="verification_code"
                noStyle
                rules={[{ required: true, whitespace: true, message: t('请输入邮箱验证码', 'Enter the email code') }]}
              >
                <Input autoComplete="one-time-code" placeholder={t('6 位验证码', '6-digit code')} />
              </Form.Item>
              <Button
                onClick={handleSendCode}
                loading={sendingCode}
                disabled={countdown.secondsLeft > 0}
              >
                {countdown.secondsLeft > 0 ? t(`${countdown.secondsLeft} 秒后重发`, `Resend in ${countdown.secondsLeft}s`) : t('发送验证码', 'Send code')}
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
        {t('创建账号', 'Create account')}
      </Button>
    </Form>
  )
}
