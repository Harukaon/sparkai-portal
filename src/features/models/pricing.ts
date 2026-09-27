export interface PricingModel {
  model_name: string
  description?: string
  icon?: string
  tags?: string
  vendor_id?: number
  owner_by?: string
  quota_type: number
  model_ratio: number
  model_price: number
  completion_ratio: number
  enable_groups: string[]
  supported_endpoint_types?: string[]
  billing_mode?: string
  billing_expr?: string
}

export interface PricingVendor {
  id: number
  name: string
  icon?: string
}

/** 注意：New API 把元数据放在 data 旁边，而非 data 里面。 */
export interface PricingResponse {
  success: boolean
  message?: string
  data: PricingModel[]
  vendors: PricingVendor[]
  group_ratio: Record<string, number>
  usable_group: Record<string, string>
  auto_groups?: string[]
}

export type ModelPrice =
  | { kind: 'tokens'; input: number; output: number }
  | { kind: 'request'; each: number }
  | { kind: 'dynamic' }
  | { kind: 'unknown' }

/**
 * 后端倍率定价：1M 输入 token 的美元价格是 model_ratio × 2 × group_ratio；
 * 输出再乘 completion_ratio。按次模型则是 model_price × group_ratio 美元/次。
 * 自动分组无法预知最终倍率，因此不能冒充一个固定价格。
 */
export function modelPrice(model: PricingModel, groupRatio?: number): ModelPrice {
  if (model.billing_mode === 'tiered_expr' || model.billing_expr) return { kind: 'dynamic' }
  if (groupRatio === undefined || !Number.isFinite(groupRatio)) return { kind: 'unknown' }
  if (model.quota_type === 1) {
    return { kind: 'request', each: model.model_price * groupRatio }
  }
  if (model.quota_type === 0) {
    const input = model.model_ratio * 2 * groupRatio
    return { kind: 'tokens', input, output: input * model.completion_ratio }
  }
  return { kind: 'unknown' }
}

export function matchesGroup(model: PricingModel, group: string): boolean {
  return model.enable_groups.includes('all') || model.enable_groups.includes(group)
}
