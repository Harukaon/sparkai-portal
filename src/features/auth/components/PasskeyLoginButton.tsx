import { KeyOutlined } from '@ant-design/icons'
import { Alert, Button, Select } from 'antd'
import { useState } from 'react'

import { loginWithPasskey } from '@/features/auth/passkey'
import type { AuthBundle, SystemStatus } from '@/features/auth/types'
import { errorMessage } from '@/shared/api/client'

interface Props {
  status: SystemStatus
  onAuthenticated: (bundle: AuthBundle) => void
}

export function PasskeyLoginButton({ status, onAuthenticated }: Props) {
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
      setError(errorMessage(caught, '通行密钥登录失败'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button block icon={<KeyOutlined />} loading={loading} onClick={() => void start()}>使用通行密钥登录</Button>
      {(status.passkey_rp_ids?.length ?? 0) > 1 ? (
        <Select
          value={rpID}
          placeholder="选择通行密钥所属域名"
          onChange={setRPID}
          allowClear
          options={status.passkey_rp_ids?.map((domain) => ({ label: domain, value: domain }))}
          aria-label="通行密钥所属域名"
        />
      ) : null}
      {error ? <Alert type="error" showIcon title={error} /> : null}
    </>
  )
}
