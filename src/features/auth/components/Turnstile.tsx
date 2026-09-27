import { useEffect, useRef } from 'react'

/**
 * Cloudflare Turnstile 人机验证。
 * 只有后台开了「Turnstile 校验」才会渲染；令牌是一次性的，
 * 用过一次（无论成败）都要让父组件换 key 重新挂载，拿新令牌。
 */

interface TurnstileApi {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let loading: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        loading = null
        reject(new Error('人机验证加载失败'))
      }
      document.head.appendChild(script)
    })
  }
  return loading
}

interface TurnstileProps {
  siteKey: string
  /** 拿到令牌时回传；过期或出错时回传空串 */
  onToken: (token: string) => void
}

export function Turnstile({ siteKey, onToken }: TurnstileProps) {
  const container = useRef<HTMLDivElement>(null)
  const onTokenRef = useRef(onToken)

  useEffect(() => {
    onTokenRef.current = onToken
  }, [onToken])

  useEffect(() => {
    let widgetId: string | undefined
    let cancelled = false

    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return
        widgetId = window.turnstile.render(container.current, {
          sitekey: siteKey,
          language: 'zh-CN',
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(''),
          'error-callback': () => onTokenRef.current(''),
        })
      })
      .catch(() => onTokenRef.current(''))

    return () => {
      cancelled = true
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId)
      }
    }
  }, [siteKey])

  return <div ref={container} />
}
