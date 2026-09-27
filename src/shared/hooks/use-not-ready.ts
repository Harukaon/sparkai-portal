import { App as AntdApp } from 'antd'
import { useCallback } from 'react'

/**
 * 统一的「功能还没做」提示。
 * 站上还有大量入口没接（导航、登录、注册……），
 * 点下去必须给人一个明确反馈，不能无声无息什么都不发生。
 */
export function useNotReady() {
  const { message } = AntdApp.useApp()

  return useCallback(
    (label: string) => {
      message.info(`「${label}」还没做，下一步跟你确认`)
    },
    [message],
  )
}
