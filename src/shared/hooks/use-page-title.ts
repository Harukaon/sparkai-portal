import { useEffect } from 'react'

import { useLang } from '@/shared/i18n'
import { pageTitle } from '@/shared/lib/env'

/** 设置浏览器标签标题，页面组件里调用一次即可；传入已按语言挑好的标题 */
export function usePageTitle(title?: string) {
  const lang = useLang()
  useEffect(() => {
    document.title = pageTitle(title)
  }, [title, lang])
}
