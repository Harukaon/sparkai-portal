/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 站点名称，显示在页头、页脚与浏览器标签 */
  readonly VITE_SITE_NAME_ZH?: string
  readonly VITE_SITE_NAME_EN?: string
  /** 接口基地址；留空表示走同域 /api/** */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
