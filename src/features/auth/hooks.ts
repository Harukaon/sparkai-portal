import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { fetchSystemStatus } from '@/features/auth/api'

/** 系统开关变化很少，5 分钟内复用缓存 */
export function useSystemStatus() {
  return useQuery({
    queryKey: ['system-status'],
    queryFn: fetchSystemStatus,
    staleTime: 5 * 60_000,
  })
}

/** 发送验证码后的倒计时，防止用户连点 */
export function useCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(0)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearInterval(timer.current), [])

  function start(seconds: number) {
    window.clearInterval(timer.current)
    setSecondsLeft(seconds)
    timer.current = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer.current)
          return 0
        }
        return current - 1
      })
    }, 1000)
  }

  return { secondsLeft, start }
}
