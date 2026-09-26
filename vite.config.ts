import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: Number(env.VITE_DEV_PORT ?? 5273),
      // 本地开发时把接口请求转给后端，避免跨域。
      // 后端地址通过 .env.local 的 VITE_PROXY_TARGET 覆盖。
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:8787',
          changeOrigin: true,
        },
      },
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          // 把体积最大的两块单独拆出来，避免首屏 bundle 过大
          manualChunks(id: string) {
            if (id.includes('node_modules/antd') || id.includes('node_modules/@ant-design')) {
              return 'antd'
            }
            if (
              id.includes('node_modules/react') ||
              id.includes('node_modules/scheduler') ||
              id.includes('node_modules/react-router')
            ) {
              return 'react'
            }
            return undefined
          },
        },
      },
    },
  }
})
