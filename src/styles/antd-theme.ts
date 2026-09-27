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
    colorPrimary: '#16150f',
    // 主色是近黑，antd 自动推导出的「浅色主色」会变成深灰（下拉选中项、日期选中等发黑），
    // 这里把浅色系一律指定为暖灰，和 tokens.css 的 accent-soft 保持一致
    colorPrimaryBg: '#f1efea',
    colorPrimaryBgHover: '#e9e5dc',
    colorPrimaryBorder: '#ddd6c8',
    colorPrimaryBorderHover: '#b3ada1',
    colorPrimaryHover: '#37322a',
    colorPrimaryActive: '#000000',
    colorPrimaryText: '#16150f',
    colorPrimaryTextHover: '#37322a',
    colorLink: '#16150f',
    colorLinkHover: '#55504a',
    controlItemBgHover: '#f4f2ee',
    controlItemBgActive: '#f1efea',
    controlItemBgActiveHover: '#e9e5dc',
    controlOutline: 'rgba(22, 21, 15, 0.08)',
    colorSuccess: '#2f7a52',
    colorWarning: '#b4761b',
    colorError: '#b3452f',
    colorInfo: '#3d6480',
    // 状态色的浅底统一用 tokens.css 里的 *-soft，避免标签底色发灰发脏
    colorSuccessBg: '#e8f3ec',
    colorSuccessBorder: '#bfdcc9',
    colorWarningBg: '#fbf0dc',
    colorWarningBorder: '#efd3a4',
    colorErrorBg: '#fbeae6',
    colorErrorBorder: '#efc2b8',
    colorInfoBg: '#eaf1f5',
    colorInfoBorder: '#c3d5e1',

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
    Select: {
      optionSelectedBg: '#f1efea',
      optionSelectedColor: '#16150f',
      optionSelectedFontWeight: 600,
      optionActiveBg: '#f4f2ee',
    },
    Menu: {
      itemSelectedBg: '#f1efea',
      itemSelectedColor: '#16150f',
    },
    Button: {
      // 主色是近黑，所以按钮上的文字要用浅色（之前黄底是深色字）
      primaryColor: '#fbf9f5',
      primaryShadow: 'none',
      fontWeight: 500,
      defaultBorderColor: '#ddd6c8',
    },
  },
}
