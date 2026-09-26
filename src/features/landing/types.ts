/** 页面业务数据结构：字段名与后端接口对齐，接真接口时只换数据来源，组件不用改 */

/** 一个模型条目 */
export interface ModelItem {
  /** 调用时填的 model 参数 */
  id: string
  /** 展示名 */
  name: string
  /** 上下文长度（token 数） */
  contextWindow: number
  /** 该模型走哪个协议端点 */
  endpoint: 'openai' | 'anthropic'
  /** 附加标签，如「推理强」「响应快」 */
  tag?: string
}

/** 模型分组（按厂商） */
export interface ModelGroup {
  id: string
  name: string
  models: ModelItem[]
}

/** 计费示例，用于「一次请求怎么算钱」 */
export interface BillingExample {
  model: string
  inputTokens: number
  outputTokens: number
  /** 输入单价：美元 / 百万 token */
  inputPrice: number
  /** 输出单价：美元 / 百万 token */
  outputPrice: number
}

/** 接入步骤 */
export interface AccessStep {
  title: string
  description: string
  /** 可选代码片段 */
  code?: string
}

/** 接入地址条目 */
export interface EndpointItem {
  label: string
  value: string
  hint: string
}
