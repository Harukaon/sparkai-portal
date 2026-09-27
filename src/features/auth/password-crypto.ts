/**
 * 登录密码加密（后台开启「密码加密登录」时使用）。
 *
 * 协议与 New API 服务端一致：
 *   - 短密码：直接 RSA-OAEP(SHA-256) 加密，结果 base64；
 *   - 超出单块长度：v2 混合加密 —— 随机 AES-256-GCM 密钥加密密码，
 *     再用 RSA-OAEP（label = "password-v2"）包住这把密钥，
 *     拼成 "v2.<包裹的密钥>.<nonce>.<密文>"，GCM 附加数据为 "password-v2:<kid>"。
 */

const V2_LABEL = 'password-v2'

/** RSA-OAEP(SHA-256) 单块最多能加密 模长 - 2×32 - 2 字节 */
const OAEP_SHA256_OVERHEAD = 66

export interface EncryptedPassword {
  password_encrypted: string
  encryption_key_id: string
}

function pemToBytes(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '')
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function toBase64(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

/** 纯函数：用给定公钥加密。单独拆出来便于单测 */
export async function encryptWithPublicKey(
  password: string,
  publicKeyPem: string,
  keyId: string,
): Promise<EncryptedPassword> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new Error('当前浏览器环境不支持加密登录，请通过 HTTPS 访问')
  }

  const publicKey = await subtle.importKey(
    'spki',
    pemToBytes(publicKeyPem),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  )
  const encoder = new TextEncoder()
  const plaintext = encoder.encode(password)
  const modulusBytes = (publicKey.algorithm as RsaHashedKeyAlgorithm).modulusLength / 8

  if (plaintext.byteLength <= modulusBytes - OAEP_SHA256_OVERHEAD) {
    const ciphertext = await subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, plaintext)
    return { password_encrypted: toBase64(ciphertext), encryption_key_id: keyId }
  }

  const secret = globalThis.crypto.getRandomValues(new Uint8Array(32))
  const nonce = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const aesKey = await subtle.importKey('raw', secret, 'AES-GCM', false, ['encrypt'])
  const [wrappedKey, sealed] = await Promise.all([
    subtle.encrypt({ name: 'RSA-OAEP', label: encoder.encode(V2_LABEL) }, publicKey, secret),
    subtle.encrypt(
      { name: 'AES-GCM', iv: nonce, additionalData: encoder.encode(`${V2_LABEL}:${keyId}`) },
      aesKey,
      plaintext,
    ),
  ])

  return {
    password_encrypted: ['v2', toBase64(wrappedKey), toBase64(nonce), toBase64(sealed)].join('.'),
    encryption_key_id: keyId,
  }
}
