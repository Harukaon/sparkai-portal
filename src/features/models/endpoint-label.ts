/** 悬浮提示用的接口类型全名；openai-response 额外注明协议家族 */
export function endpointLabel(endpoint: string): string {
  if (endpoint === 'openai-response') return 'openai-response（OpenAI Responses / WebSocket 协议）'
  return endpoint
}
