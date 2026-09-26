import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/jetbrains-mono'
import '@/styles/tokens.css'
import '@/styles/global.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/App'

const container = document.getElementById('root')

if (!container) {
  throw new Error('找不到挂载节点 #root，请检查 index.html')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
