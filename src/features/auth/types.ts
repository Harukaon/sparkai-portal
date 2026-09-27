/**
 * 登录注册相关的数据结构，字段名与 New API（v1.0.0-rc.40）保持一致。
 * 只列我们用得到的字段，后端多返回的字段不影响。
 */

/** 当前登录用户 */
export interface AuthUser {
  id: number
  username: string
  display_name: string
  email: string
  /** 1 普通用户 / 10 管理员 / 100 超级管理员 */
  role: number
  /** 1 正常 / 2 封禁 */
  status: number
  /** 所在分组，决定能用哪些模型、按什么倍率计费 */
  group: string
  /** 剩余额度（内部单位，除以 quota_per_unit 才是美元） */
  quota: number
  /** 已用额度（内部单位） */
  used_quota: number
  request_count: number
  aff_code: string
}

/** 一次登录会话（对应一台设备上的一次登录） */
export interface LoginSession {
  sid: string
  current: boolean
  login_method: string
  ip: string
  user_agent: string
  created_at: number
  last_active_at: number
  expires_at: number
}

/** 登录成功后拿到的整包数据：短期访问令牌 + 用户 + 会话 */
export interface AuthBundle {
  access_token: string
  token_type: string
  /** 访问令牌过期时间（Unix 秒），默认 15 分钟 */
  access_expires_at: number
  user: AuthUser
  session: LoginSession
}

export type VerificationMethod = '2fa' | 'passkey' | 'oauth' | 'password' | 'session'

/** 账号开了二次验证时，登录接口返回的是这个，而不是 AuthBundle */
export interface LoginChallenge {
  require_verification: true
  flow_token: string
  expires_at: number
  methods: { method: VerificationMethod; available: boolean; reason?: string }[]
}

export type LoginResult = AuthBundle | LoginChallenge

export function isLoginChallenge(result: LoginResult): result is LoginChallenge {
  return (result as LoginChallenge).require_verification === true
}

/** 后台可配置的自定义 OAuth 登录方式 */
export interface CustomOAuthProvider {
  slug: string
  name: string
  icon?: string
  client_id: string
  authorization_endpoint: string
  scopes?: string
}

/** /api/status 里与登录注册、额度显示相关的系统开关 */
export interface SystemStatus {
  system_name: string
  logo?: string
  version?: string

  register_enabled: boolean
  password_login_enabled: boolean
  password_register_enabled: boolean
  password_login_encryption_enabled: boolean
  email_verification: boolean

  turnstile_check: boolean
  turnstile_site_key?: string

  github_oauth: boolean
  github_client_id?: string
  discord_oauth: boolean
  discord_client_id?: string
  oidc_enabled: boolean
  oidc_client_id?: string
  oidc_authorization_endpoint?: string
  oidc_display_name?: string
  linuxdo_oauth: boolean
  linuxdo_client_id?: string
  telegram_oauth: boolean
  telegram_oauth_configured?: boolean
  telegram_bot_name?: string
  wechat_login: boolean
  wechat_qrcode?: string
  wechat_qr_code?: string
  wechat_qrcode_image_url?: string
  wechat_qr_code_image_url?: string
  passkey_login: boolean
  passkey_rp_ids?: string[]
  custom_oauth_providers?: CustomOAuthProvider[] | null

  user_agreement_enabled: boolean
  privacy_policy_enabled: boolean

  /** 多少内部额度单位等于 1 美元 */
  quota_per_unit: number
  display_in_currency: boolean
  quota_display_type?: string
}
