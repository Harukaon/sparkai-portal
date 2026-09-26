import { QueryClient } from '@tanstack/react-query'

/**
 * 服务端状态的统一缓存。
 * 约定：所有「从后端拿数据」都走 react-query，不要在组件里手写 useEffect + useState 拉数据。
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
