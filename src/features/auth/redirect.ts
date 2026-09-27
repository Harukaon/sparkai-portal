/** 登录后默认去的地方 */
export const DEFAULT_AFTER_LOGIN = '/console'

/**
 * 只允许站内相对路径作为登录后的跳转目标。
 * 防止有人构造 /login?redirect=https://钓鱼网站 把刚登录的用户带走。
 */
export function safeRedirect(target: string | null | undefined, fallback = DEFAULT_AFTER_LOGIN): string {
  if (!target) return fallback
  if (!target.startsWith('/')) return fallback
  // 双斜杠、反斜杠和控制字符可能被浏览器解析成站外地址。
  if (target.startsWith('//') || target.includes('\\')) return fallback
  for (const char of target) {
    const code = char.charCodeAt(0)
    if (code < 32 || code === 127) return fallback
  }
  const resolved = new URL(target, 'https://relay.invalid')
  if (resolved.origin !== 'https://relay.invalid') return fallback
  // 不回到登录注册页本身，避免来回跳
  if (/^\/(login|register)(\/|\?|$)/.test(target)) return fallback
  return target
}
