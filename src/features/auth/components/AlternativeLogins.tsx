import { OAuthButtons } from '@/features/auth/components/OAuthButtons'
import { PasskeyLoginButton } from '@/features/auth/components/PasskeyLoginButton'
import { WeChatLogin } from '@/features/auth/components/WeChatLogin'
import { availableOAuthOptions } from '@/features/auth/oauth'
import type { AuthBundle, LoginChallenge, SystemStatus } from '@/features/auth/types'

import styles from './OAuthButtons.module.css'

interface Props {
  status: SystemStatus
  returnTo: string
  /** 注册页只显示第三方账号；登录页还显示通行密钥和微信 */
  mode: 'login' | 'register'
  onAuthenticated?: (bundle: AuthBundle) => void
  onChallenge?: (challenge: LoginChallenge) => void
}

/**
 * 「或使用其他方式」区块：只显示后台已经开启的方式，一个都没开就整块不出现。
 * 所有按钮放在同一个列表里，间距统一。
 */
export function AlternativeLogins({ status, returnTo, mode, onAuthenticated, onChallenge }: Props) {
  const oauth = availableOAuthOptions(status).length > 0
  const passkey = mode === 'login' && status.passkey_login && Boolean(onAuthenticated)
  const wechat = mode === 'login' && status.wechat_login && Boolean(onAuthenticated && onChallenge)
  if (!oauth && !passkey && !wechat) return null

  return (
    <div className={styles.wrap}>
      <div className={styles.separator}>
        <span>或使用其他方式</span>
      </div>
      <div className={styles.options}>
        <OAuthButtons status={status} returnTo={returnTo} action={mode === 'login' ? '登录' : '继续'} />
        {passkey && onAuthenticated ? <PasskeyLoginButton status={status} onAuthenticated={onAuthenticated} /> : null}
        {wechat && onAuthenticated && onChallenge ? (
          <WeChatLogin status={status} onAuthenticated={onAuthenticated} onChallenge={onChallenge} />
        ) : null}
      </div>
    </div>
  )
}
