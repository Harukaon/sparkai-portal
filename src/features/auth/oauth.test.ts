import { describe, expect, it } from 'vitest'

import type { SystemStatus } from './types'
import { authorizationUrl, availableOAuthOptions } from './oauth'

const status = {
  github_oauth: true,
  github_client_id: 'client-1',
  discord_oauth: true,
  discord_client_id: 'client-2',
  oidc_enabled: false,
  linuxdo_oauth: false,
  telegram_oauth: false,
  custom_oauth_providers: [
    { slug: 'work', name: '公司账号', client_id: 'work-client', authorization_endpoint: 'https://login.example/authorize', scopes: 'openid email' },
  ],
} as SystemStatus

describe('OAuth 协议', () => {
  it('只显示后台启用且资料完整的登录方式', () => {
    expect(availableOAuthOptions(status).map((item) => item.slug)).toEqual(['github', 'discord', 'work'])
  })

  it('用一次性 state 和本站回调地址构建授权请求', () => {
    const url = new URL(authorizationUrl('discord', 'one-time-state', status, 'https://relay.example'))
    expect(url.hostname).toBe('discord.com')
    expect(url.searchParams.get('state')).toBe('one-time-state')
    expect(url.searchParams.get('redirect_uri')).toBe('https://relay.example/oauth/discord')
  })

  it('自定义登录方式携带后台给定的授权地址和 scope', () => {
    const url = new URL(authorizationUrl('work', 'state-2', status, 'https://relay.example'))
    expect(url.hostname).toBe('login.example')
    expect(url.searchParams.get('scope')).toBe('openid email')
    expect(url.searchParams.get('redirect_uri')).toBe('https://relay.example/oauth/work')
  })

  it('后台未开启的登录方式不可主动发起；危险地址被拦下', () => {
    expect(() => authorizationUrl('oidc', 'state', status, 'https://relay.example')).toThrow()
    const bad = { ...status, custom_oauth_providers: [{ slug: 'bad', name: '错误地址', client_id: 'x', authorization_endpoint: 'javascript:alert(1)' }] }
    expect(() => authorizationUrl('bad', 'state', bad, 'https://relay.example')).toThrow()
  })
})
