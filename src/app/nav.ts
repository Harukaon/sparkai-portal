/** 顶部导航项：锚点跳转到首页各区块，新增区块时同步这里 */
export interface NavItem {
  label: string
  href: string
}

export const NAV_ITEMS: NavItem[] = [
  { label: '能做什么', href: '#capability' },
  { label: '支持模型', href: '#models' },
  { label: '价格', href: '#pricing' },
  { label: '接入步骤', href: '#steps' },
]

/** 主行动按钮统一指向接入卡片 */
export const PRIMARY_ACTION_HREF = '#access'

/** 页脚链接（先占位，等对应页面做好再换成路由） */
export const FOOTER_LINKS: NavItem[] = [
  { label: '接口文档', href: '#access' },
  { label: '支持模型', href: '#models' },
  { label: '价格说明', href: '#pricing' },
  { label: '服务状态', href: '#access' },
]
