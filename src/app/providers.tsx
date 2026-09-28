import { App as AntdApp, ConfigProvider } from 'antd'
import enUS from 'antd/locale/en_US'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/en'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { queryClient } from '@/shared/api/query-client'
import { useLang } from '@/shared/i18n'
import { antdTheme } from '@/styles/antd-theme'

/**
 * 全站 Provider 汇总处，顺序有讲究：
 * ConfigProvider（主题/语言） → AntdApp（message/modal 的上下文） → QueryClient。
 *
 * 组件自带文字（分页、日期选择、空状态等）跟随当前语言切换。
 *
 * 注意：路由的 provider（RouterProvider）在 App.tsx 里，不要在这里再包一层 Router，
 * 一个应用只能有一个 Router，套两层会直接白屏。
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const lang = useLang()
  dayjs.locale(lang === 'zh' ? 'zh-cn' : 'en')

  return (
    <ConfigProvider theme={antdTheme} locale={lang === 'zh' ? zhCN : enUS}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  )
}
