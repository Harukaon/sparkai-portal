import { encryptWithPublicKey } from '@/features/auth/password-crypto'
import type { AuthBundle, AuthUser, LoginResult, SystemStatus } from '@/features/auth/types'
import { apiGet, apiPost } from '@/shared/api/client'

/** 使用访问令牌向服务端确认当前用户 */
export function fetchCurrentUser(): Promise<AuthUser> {
  return apiGet<AuthUser>('/api/user/self')
}

/** 系统开关：开了哪些登录方式、是否要人机验证、额度怎么换算 */
export function fetchSystemStatus(): Promise<SystemStatus> {
  return apiGet<SystemStatus>('/api/status', undefined, { skipAuth: true })
}

interface EncryptionKey {
  kid: string
  public_key: string
}

async function fetchEncryptionKey(): Promise<EncryptionKey> {
  return apiGet<EncryptionKey>('/api/user/login/encryption-key', undefined, { skipAuth: true })
}

export interface PasswordLoginInput {
  /** 用户名或邮箱 */
  username: string
  password: string
  /** Cloudflare 人机验证令牌，后台没开就留空 */
  turnstile?: string
  /** 后台开了「密码加密登录」时为 true */
  encrypt: boolean
}

export async function loginWithPassword(input: PasswordLoginInput): Promise<LoginResult> {
  const passwordFields = input.encrypt
    ? await (async () => {
        const key = await fetchEncryptionKey()
        return encryptWithPublicKey(input.password, key.public_key, key.kid)
      })()
    : { password: input.password }

  return apiPost<LoginResult>(
    '/api/user/login',
    { username: input.username, ...passwordFields },
    { skipAuth: true, params: { turnstile: input.turnstile ?? '' } },
  )
}

/** 账号开了两步验证：用验证器 App 里的 6 位码（或备用码）完成登录 */
export function loginWith2FA(flowToken: string, code: string): Promise<AuthBundle> {
  return apiPost<AuthBundle>(
    '/api/user/login/2fa',
    { flow_token: flowToken, code },
    { skipAuth: true },
  )
}

export interface RegisterInput {
  username: string
  password: string
  email?: string
  verification_code?: string
  aff_code?: string
  turnstile?: string
}

export async function register(input: RegisterInput): Promise<void> {
  const { turnstile, ...body } = input
  await apiPost<unknown>('/api/user/register', body, {
    skipAuth: true,
    params: { turnstile: turnstile ?? '' },
  })
}

/** 发送邮箱验证码（注册时用） */
export async function sendEmailVerificationCode(email: string, turnstile?: string): Promise<void> {
  await apiGet<unknown>('/api/verification', { email, turnstile: turnstile ?? '' }, { skipAuth: true })
}
