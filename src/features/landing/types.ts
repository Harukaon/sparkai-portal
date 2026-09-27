/** 页面业务数据结构：字段名与后端接口对齐，接真接口时只换数据来源，组件不用改 */

/** 一档价格：输入与输出分别计价，单位是「美元 / 百万 token」 */
export interface UnitPrice {
  /** 输入（提问）单价 */
  input: number
  /** 输出（回答）单价 */
  output: number
}

/** 一个模型的价格对比：官方直连 vs 走本站 */
export interface PriceRow {
  /** 调用时填的 model 参数 */
  id: string
  /** 展示名 */
  name: string
  /** 上游厂商 */
  provider: string
  /** 图标名，和 New API 后台的写法一致，如 `Claude.Color` */
  icon: string
  /** 官方直连的价格 */
  official: UnitPrice
  /** 走本站的价格 */
  ours: UnitPrice
}

/** 底部的一条数据 */
export interface StatItem {
  /** 数值或主文案，如「10,000+」 */
  value: string
  /** 说明 */
  label: string
  /** 图标标识，由组件映射成具体图标 */
  icon: 'users' | 'cube' | 'bolt' | 'globe'
}
