export interface NavItem {
  label: string
  to: string
  /** 只有登录后才显示 */
  authOnly?: boolean
}

/** 顶部导航：只放已经做好的页面，没做的不写。当前所在页面会高亮。 */
export const NAV_ITEMS: NavItem[] = [
  { label: '模型广场', to: '/models' },
  { label: '快速开始', to: '/quickstart' },
  { label: '控制台', to: '/console', authOnly: true },
]

/** 主行动按钮文案，顶栏与首屏共用 */
export const PRIMARY_ACTION_LABEL = '立即开始'
