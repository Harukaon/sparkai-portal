import type { ReactNode } from 'react'
import {
  HomeOutlined,
  AppstoreOutlined,
  RobotOutlined,
  RocketOutlined,
  UserOutlined,
} from '@ant-design/icons'

import type { Lang } from '@/shared/i18n'

export interface NavItem {
  /** [中文, 英文] */
  label: [string, string]
  to: string
  icon: ReactNode
  /** 只有登录后才显示 */
  authOnly?: boolean
  /** 是否进入手机底部导航 */
  inTabBar?: boolean
}

/** 顶部导航：只放已经做好的页面，没做的不写。当前所在页面会高亮。 */
export const NAV_ITEMS: NavItem[] = [
  { label: ['模型广场', 'Models'], to: '/models', icon: <AppstoreOutlined />, inTabBar: true },
  { label: ['Agent', 'Agent'], to: '/agent', icon: <RobotOutlined /> },
  { label: ['快速开始', 'Quick Start'], to: '/quickstart', icon: <RocketOutlined /> },
  { label: ['控制台', 'Console'], to: '/console', icon: <UserOutlined />, authOnly: true, inTabBar: true },
]

/** 手机底部导航：首页固定第一位，再追加上面勾选的页面 */
export const TAB_BAR_HOME = { label: ['首页', 'Home'] as [string, string], to: '/', icon: <HomeOutlined /> }

/** 主行动按钮文案，顶栏与首屏共用 */
export const PRIMARY_ACTION_LABEL: [string, string] = ['立即开始', 'Get Started']

export function navLabel(label: [string, string], lang: Lang): string {
  return lang === 'zh' ? label[0] : label[1]
}
