import { createBrowserRouter } from 'react-router-dom'

import { SiteLayout } from '@/app/layout/SiteLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { HomePage } from '@/pages/landing/HomePage'

/**
 * 路由表：新增页面在这里加一条。
 * 路由级代码分割（React.lazy）等页面多起来再加，现在没必要。
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <SiteLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
