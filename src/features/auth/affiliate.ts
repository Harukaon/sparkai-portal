/**
 * 邀请码：用户通过 ?aff=xxx 的链接进站时记下来，注册时带给后端。
 * 存 localStorage，是因为访客常常先逛首页、过一会儿才去注册。
 */
const STORAGE_KEY = 'relay.aff'

export function captureAffiliateCode(): void {
  if (typeof window === 'undefined') return
  const code = new URLSearchParams(window.location.search).get('aff')?.trim()
  if (code) {
    window.localStorage.setItem(STORAGE_KEY, code)
  }
}

export function getAffiliateCode(): string {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(STORAGE_KEY) ?? ''
}
