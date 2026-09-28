import { App as AntdApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { queryClient } from '@/shared/api/query-client'
import { antdTheme } from '@/styles/antd-theme'

// 组件自带文字（分页「条/页」、日期选择、空状态等）统一用中文
dayjs.locale('zh-cn')

/**
 * 全站 Provider 汇总处，顺序有讲究：
 * ConfigProvider（主题/语言） → AntdApp（message/modal 的上下文） → QueryClient。
 *
 * 注意：路由的 provider（RouterProvider）在 App.tsx 里，不要在这里再包一层 Router，
 * 一个应用只能有一个 Router，套两层会直接白屏。
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider theme={antdTheme} locale={zhCN}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  )
}
