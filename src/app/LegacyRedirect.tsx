import { Navigate, useLocation } from 'react-router-dom'

/** New API 支付完成/取消后固定跳回 /wallet、/usage-logs，这里转到本站对应页面并保留参数 */
export function LegacyRedirect({ to }: { to: string }) {
  const { search } = useLocation()
  return <Navigate to={`${to}${search}`} replace />
}
