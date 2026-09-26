import { useEffect } from 'react'

import { pageTitle } from '@/shared/lib/env'

/** 设置浏览器标签标题，页面组件里调用一次即可 */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = pageTitle(title)
  }, [title])
}
