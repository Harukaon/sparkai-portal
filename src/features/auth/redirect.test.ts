import { describe, expect, it } from 'vitest'

import { DEFAULT_AFTER_LOGIN, safeRedirect } from './redirect'

describe('safeRedirect', () => {
  it('站内路径原样放行，带查询参数也可以', () => {
    expect(safeRedirect('/console/tokens?page=2')).toBe('/console/tokens?page=2')
  })

  it('没有目标时去默认页', () => {
    expect(safeRedirect(null)).toBe(DEFAULT_AFTER_LOGIN)
    expect(safeRedirect('')).toBe(DEFAULT_AFTER_LOGIN)
  })

  it('拒绝跳到外站', () => {
    expect(safeRedirect('https://evil.com')).toBe(DEFAULT_AFTER_LOGIN)
    expect(safeRedirect('//evil.com')).toBe(DEFAULT_AFTER_LOGIN)
    expect(safeRedirect('/\\evil.com')).toBe(DEFAULT_AFTER_LOGIN)
    expect(safeRedirect('/foo\\bar')).toBe(DEFAULT_AFTER_LOGIN)
    expect(safeRedirect('/\t/evil.com')).toBe(DEFAULT_AFTER_LOGIN)
    expect(safeRedirect('javascript:alert(1)')).toBe(DEFAULT_AFTER_LOGIN)
  })

  it('不跳回登录注册页本身', () => {
    expect(safeRedirect('/login')).toBe(DEFAULT_AFTER_LOGIN)
    expect(safeRedirect('/register?aff=abc')).toBe(DEFAULT_AFTER_LOGIN)
  })

  it('名字以 login 开头的其他页面不误伤', () => {
    expect(safeRedirect('/login-history')).toBe('/login-history')
  })
})
