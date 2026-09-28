import { apiGet, apiPost } from '@/shared/api/client'

/** 取自己的邀请码；New API 在用户第一次查看时自动生成。 */
export function fetchInviteCode() {
  return apiGet<string>('/api/user/aff')
}

/**
 * 把邀请奖励转入可用余额。quota 为内部额度，后端要求至少 1 美元额度（500,000），
 * 且站长需在后台完成「支付合规确认」后才可用。
 */
export async function transferInviteReward(quota: number): Promise<void> {
  await apiPost<unknown>('/api/user/aff_transfer', { quota })
}

/** 邀请链接指向本站注册页，注册时会自动带上邀请码。 */
export function inviteLink(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, '')}/register?aff=${encodeURIComponent(code)}`
}
