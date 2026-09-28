import { tr } from '@/shared/i18n'
import type { AuthBundle } from '@/features/auth/types'
import { apiPost } from '@/shared/api/client'

interface PasskeyBegin {
  flow_token: string
  options: { publicKey?: Record<string, unknown>; PublicKey?: Record<string, unknown> }
}

function decodeBase64Url(value: string): ArrayBuffer {
  const text = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(text.padEnd(Math.ceil(text.length / 4) * 4, '='))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes.buffer
}

function encodeBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function prepareOptions(payload: PasskeyBegin): PublicKeyCredentialRequestOptions {
  const options = payload.options?.publicKey ?? payload.options?.PublicKey
  if (!options || typeof options.challenge !== 'string') throw new Error(tr('通行密钥挑战数据不完整', 'Invalid passkey challenge data'))
  const allowCredentials = options.allowCredentials
  return {
    ...options,
    challenge: decodeBase64Url(options.challenge),
    allowCredentials: Array.isArray(allowCredentials)
      ? allowCredentials.map((item: { id: string; type: 'public-key'; transports?: AuthenticatorTransport[] }) => ({
          ...item, id: decodeBase64Url(item.id),
        }))
      : undefined,
  } as PublicKeyCredentialRequestOptions
}

function assertionJSON(credential: PublicKeyCredential): Record<string, unknown> {
  const response = credential.response as AuthenticatorAssertionResponse
  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    response: {
      authenticatorData: encodeBase64Url(response.authenticatorData),
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      signature: encodeBase64Url(response.signature),
      userHandle: response.userHandle ? encodeBase64Url(response.userHandle) : null,
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  }
}

async function requestAssertion(begin: PasskeyBegin): Promise<Record<string, unknown>> {
  if (!begin?.flow_token) throw new Error(tr('通行密钥挑战已失效，请重新尝试', 'Passkey challenge expired — try again'))
  let credential: Credential | null
  try {
    credential = await navigator.credentials.get({ publicKey: prepareOptions(begin) })
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      throw new Error(tr('已取消通行密钥验证，或验证超时', 'Passkey verification cancelled or timed out'))
    }
    throw error
  }
  if (!(credential instanceof PublicKeyCredential)) throw new Error(tr('没有获取到有效的通行密钥', 'No valid passkey was returned'))
  return assertionJSON(credential)
}

function requireWebAuthn(): void {
  if (!window.PublicKeyCredential || !navigator.credentials?.get) {
    throw new Error(tr('当前浏览器不支持通行密钥登录', 'This browser does not support passkey sign-in'))
  }
}

/** 无密码通行密钥登录；仅在后台开启且浏览器支持 WebAuthn 时调用。 */
export async function loginWithPasskey(rpID?: string): Promise<AuthBundle> {
  requireWebAuthn()
  const begin = await apiPost<PasskeyBegin>(
    '/api/user/passkey/login/begin', rpID ? { rp_id: rpID } : undefined, { skipAuth: true },
  )
  const credential = await requestAssertion(begin)
  return apiPost<AuthBundle>(
    '/api/user/passkey/login/finish',
    { flow_token: begin.flow_token, credential }, { skipAuth: true },
  )
}

/** 密码/OAuth 登录遇到通行密钥二次验证时，先走原来的 flow_token 再取断言。 */
export async function verifyPasskeyChallenge(flowToken: string, rpID?: string): Promise<AuthBundle> {
  requireWebAuthn()
  const begin = await apiPost<PasskeyBegin>('/api/user/login/passkey/begin', {
    flow_token: flowToken, ...(rpID ? { rp_id: rpID } : {}),
  }, { skipAuth: true })
  const credential = await requestAssertion(begin)
  return apiPost<AuthBundle>('/api/user/login/passkey/finish', {
    flow_token: flowToken, passkey_flow_token: begin.flow_token, credential,
  }, { skipAuth: true })
}
