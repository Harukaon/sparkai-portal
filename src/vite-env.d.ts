/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 站点名称，显示在页头、页脚与浏览器标签 */
  readonly VITE_SITE_NAME?: string
  /** 接口基地址；留空表示走同域 /api/** */
  readonly VITE_API_BASE_URL?: string
  /** 页面标题后缀 */
  readonly VITE_SITE_TITLE_SUFFIX?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
