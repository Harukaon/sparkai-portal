import { useCallback } from 'react'
import { create } from 'zustand'

/**
 * 轻量中英双语。
 *
 * 文案就近写在组件里：t('登录', 'Sign in')，中英文放在一起，改文案不用来回翻字典文件。
 * 非组件代码（请求层、工具函数）用 tr()，读的是当前语言的快照。
 */
export type Lang = 'zh' | 'en'

export type Translate = (zh: string, en: string) => string

const STORAGE_KEY = 'sparkai.lang'

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch {
    // 隐私模式下读不了本地存储，按浏览器语言走
  }
  if (typeof navigator === 'undefined') return 'zh'
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

function applyDocumentLang(lang: Lang): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }
}

interface LangState {
  lang: Lang
  setLang: (lang: Lang) => void
}

export const useLangStore = create<LangState>((set) => ({
  lang: detectLang(),
  setLang: (lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // 存不下就只在本次访问生效
    }
    applyDocumentLang(lang)
    set({ lang })
  },
}))

applyDocumentLang(useLangStore.getState().lang)

export function setLang(lang: Lang): void {
  useLangStore.getState().setLang(lang)
}

export function currentLang(): Lang {
  return useLangStore.getState().lang
}

/** 非组件代码使用：按当前语言挑一句 */
export function tr(zh: string, en: string): string {
  return currentLang() === 'zh' ? zh : en
}

export function useLang(): Lang {
  return useLangStore((state) => state.lang)
}

/** 组件使用：语言切换时组件会自动重绘 */
export function useT(): Translate {
  const lang = useLang()
  return useCallback((zh: string, en: string) => (lang === 'zh' ? zh : en), [lang])
}
