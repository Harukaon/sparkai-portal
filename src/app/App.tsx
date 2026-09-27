import { RouterProvider } from 'react-router-dom'

import { AppProviders } from '@/app/providers'
import { router } from '@/app/router'
import { AuthBootstrap } from '@/features/auth/components/AuthBootstrap'

export function App() {
  return (
    <AppProviders>
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
    </AppProviders>
  )
}
