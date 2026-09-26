import { theme } from 'antd'
import type { ThemeConfig } from 'antd'

/**
 * Ant Design 主题。
 *
 * 这里的色值必须与 `src/styles/tokens.css` 保持一致：
 * antd 组件走 token，自研组件走 CSS 变量，两条路最终指向同一套颜色。
 * 改颜色时两边一起改（约定：tokens.css 是唯一真源，先改它）。
 */
export const antdTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  // antd 6 默认使用 CSS 变量模式，无需显式开启
  token: {
    colorPrimary: '#e8a317',
    colorLink: '#9a6b06',
    colorSuccess: '#2f7a52',
    colorWarning: '#b4761b',
    colorError: '#b3452f',
    colorInfo: '#3d6480',

    colorText: '#16150f',
    colorTextSecondary: '#6b6862',
    colorTextTertiary: '#8f8a80',
    colorTextQuaternary: '#b3ada1',

    colorBgBase: '#ffffff',
    colorBgLayout: '#fbf9f5',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',

    colorBorder: '#eae5da',
    colorBorderSecondary: '#f0ebe1',
    colorSplit: '#eae5da',

    borderRadius: 10,
    borderRadiusLG: 14,
    borderRadiusSM: 8,

    controlHeight: 38,
    controlHeightLG: 44,

    fontFamily:
      "'Instrument Sans Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    fontSize: 14,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      bodyBg: '#fbf9f5',
      footerBg: 'transparent',
      headerHeight: 64,
      headerPadding: 0,
    },
    Button: {
      // 黄底必须配深色字：白色字放在 #E8A317 上对比度约 2.2:1，读不清
      primaryColor: '#1a1408',
      primaryShadow: 'none',
      fontWeight: 500,
    },
  },
}
