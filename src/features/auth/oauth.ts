import { getAffiliateCode } from '@/features/auth/affiliate'
import { safeRedirect } from '@/features/auth/redirect'
import type { CustomOAuthProvider, SystemStatus } from '@/features/auth/types'
import { apiPost } from '@/shared/api/client'

export interface OAuthOption {
  slug: string
  name: string
}

/** 只展示后台真正启用、且具备发起授权必要配置的方式。 */
export function availableOAuthOptions(status: SystemStatus): OAuthOption[] {
  const options: OAuthOption[] = []
  if (status.github_oauth && status.github_client_id) options.push({ slug: 'github', name: 'GitHub' })
  if (status.discord_oauth && status.discord_client_id) options.push({ slug: 'discord', name: 'Discord' })
  if (status.oidc_enabled && status.oidc_client_id && status.oidc_authorization_endpoint) {
    options.push({ slug: 'oidc', name: status.oidc_display_name || '企业账号' })
  }
  if (status.linuxdo_oauth && status.linuxdo_client_id) options.push({ slug: 'linuxdo', name: 'Linux DO' })
  if (status.telegram_oauth && status.telegram_oauth_configured) {
    options.push({ slug: 'telegram', name: 'Telegram' })
  }
  for (const provider of status.custom_oauth_providers ?? []) {
    if (provider.slug && provider.client_id && provider.authorization_endpoint) {
      options.push({ slug: provider.slug, name: provider.name })
    }
  }
  return options
}

function oauthUrl(endpoint: string, params: Record<string, string>): string {
  const url = new URL(endpoint)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')) {
    throw new Error('第三方登录地址不是安全的 HTTPS 地址')
  }
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}

/** 后端登记一次性 state 后，按供应商协议拼授权地址。 */
export function authorizationUrl(
  provider: string,
  state: string,
  status: SystemStatus,
  origin: string,
  telegramUrl?: string,
): string {
  const callback = `${origin}/oauth/${encodeURIComponent(provider)}`
  switch (provider) {
    case 'github':
      if (status.github_oauth && status.github_client_id) {
        return oauthUrl('https://github.com/login/oauth/authorize', {
          client_id: status.github_client_id, state, scope: 'user:email',
        })
      }
      break
    case 'discord':
      if (status.discord_oauth && status.discord_client_id) {
        return oauthUrl('https://discord.com/oauth2/authorize', {
          client_id: status.discord_client_id, state, redirect_uri: callback,
          response_type: 'code', scope: 'identify openid',
        })
      }
      break
    case 'oidc':
      if (status.oidc_enabled && status.oidc_client_id && status.oidc_authorization_endpoint) {
        return oauthUrl(status.oidc_authorization_endpoint, {
          client_id: status.oidc_client_id, state, redirect_uri: callback,
          response_type: 'code', scope: 'openid profile email',
        })
      }
      break
    case 'linuxdo':
      if (status.linuxdo_oauth && status.linuxdo_client_id) {
        return oauthUrl('https://connect.linux.do/oauth2/authorize', {
          response_type: 'code', client_id: status.linuxdo_client_id, state,
        })
      }
      break
    case 'telegram':
      if (status.telegram_oauth && status.telegram_oauth_configured && telegramUrl) {
        return oauthUrl(telegramUrl, {})
      }
      break
    default: {
      const custom: CustomOAuthProvider | undefined = status.custom_oauth_providers?.find(
        (item) => item.slug === provider,
      )
      if (custom) {
        return oauthUrl(custom.authorization_endpoint, {
          client_id: custom.client_id, redirect_uri: callback,
          response_type: 'code', state, ...(custom.scopes ? { scope: custom.scopes } : {}),
        })
      }
    }
  }
  throw new Error('该登录方式未启用或尚未配置完整')
}

const RETURN_PREFIX = 'relay.oauth.return.'

function rememberReturn(state: string, target: string): void {
  sessionStorage.setItem(`${RETURN_PREFIX}${state}`, safeRedirect(target))
}

export function consumeOAuthReturn(state: string): string {
  const key = `${RETURN_PREFIX}${state}`
  const target = sessionStorage.getItem(key)
  sessionStorage.removeItem(key)
  return safeRedirect(target)
}

interface OAuthFlow {
  flow_token: string
  authorization_url?: string
}

/** 不把一次性 state 编到任意自造 URL 里：必须先向 New API 申请。 */
export async function startOAuthLogin(
  provider: string,
  status: SystemStatus,
  returnTo: string,
): Promise<string> {
  const flow = await apiPost<OAuthFlow>('/api/oauth/state', {
    provider,
    intent: 'login',
    aff: getAffiliateCode() || undefined,
  }, { skipAuth: true })
  if (!flow?.flow_token) throw new Error('第三方登录初始化失败，请重试')
  const url = authorizationUrl(provider, flow.flow_token, status, window.location.origin, flow.authorization_url)
  rememberReturn(flow.flow_token, returnTo)
  return url
}
