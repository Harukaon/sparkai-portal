import { KeyOutlined } from '@ant-design/icons'
import { Alert, Button, Select } from 'antd'
import { useState } from 'react'

import { loginWithPasskey } from '@/features/auth/passkey'
import type { AuthBundle, SystemStatus } from '@/features/auth/types'
import { errorMessage } from '@/shared/api/client'
import { useT } from '@/shared/i18n'

interface Props {
  status: SystemStatus
  onAuthenticated: (bundle: AuthBundle) => void
}

export function PasskeyLoginButton({ status, onAuthenticated }: Props) {
  const t = useT()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rpID, setRPID] = useState<string | undefined>()
  if (!status.passkey_login) return null

  async function start() {
    setLoading(true)
    setError(null)
    try {
      onAuthenticated(await loginWithPasskey(rpID))
    } catch (caught: unknown) {
      setError(errorMessage(caught, t('通行密钥登录失败', 'Passkey sign-in failed')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button block icon={<KeyOutlined />} loading={loading} onClick={() => void start()}>{t('使用通行密钥登录', 'Sign in with a passkey')}</Button>
      {(status.passkey_rp_ids?.length ?? 0) > 1 ? (
        <Select
          value={rpID}
          placeholder={t('选择通行密钥所属域名', 'Choose the passkey domain')}
          onChange={setRPID}
          allowClear
          options={status.passkey_rp_ids?.map((domain) => ({ label: domain, value: domain }))}
          aria-label={t('通行密钥所属域名', 'Passkey domain')}
        />
      ) : null}
      {error ? <Alert type="error" showIcon title={error} /> : null}
    </>
  )
}
