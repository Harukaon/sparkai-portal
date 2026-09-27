import { createBrowserRouter } from 'react-router-dom'

import { ConsoleLayout } from '@/app/layout/ConsoleLayout'
import { SiteLayout } from '@/app/layout/SiteLayout'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { OAuthCallbackPage } from '@/pages/auth/OAuthCallbackPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { KeysPage } from '@/pages/console/KeysPage'
import { LogsPage } from '@/pages/console/LogsPage'
import { OverviewPage } from '@/pages/console/OverviewPage'
import { HomePage } from '@/pages/landing/HomePage'
import { ModelsPage } from '@/pages/models/ModelsPage'

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
      { path: 'models', element: <ModelsPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'oauth/:provider', element: <OAuthCallbackPage /> },
      {
        path: 'console',
        element: <RequireAuth><ConsoleLayout /></RequireAuth>,
        children: [
          { index: true, element: <OverviewPage /> },
          { path: 'keys', element: <KeysPage /> },
          { path: 'logs', element: <LogsPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
