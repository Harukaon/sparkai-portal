import { describe, expect, it } from 'vitest'

import { encryptWithPublicKey } from './password-crypto'

/** 生成一对 RSA 密钥，模拟服务端：公钥给前端加密，私钥用来验证能否解开 */
async function createServerKeyPair() {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt'],
  )
  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey))
  const base64 = btoa(String.fromCharCode(...spki))
  const pem = `-----BEGIN PUBLIC KEY-----\n${base64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`
  return { pem, privateKey: pair.privateKey }
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

describe('encryptWithPublicKey', () => {
  it('短密码直接用 RSA-OAEP 加密，服务端私钥能解出原文', async () => {
    const { pem, privateKey } = await createServerKeyPair()

    const result = await encryptWithPublicKey('Test12345678', pem, 'kid-1')

    expect(result.encryption_key_id).toBe('kid-1')
    expect(result.password_encrypted.startsWith('v2.')).toBe(false)
    const plain = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      fromBase64(result.password_encrypted),
    )
    expect(new TextDecoder().decode(plain)).toBe('Test12345678')
  })

  it('超长密码走 v2 混合加密，按约定格式拼装且能完整解出', async () => {
    const { pem, privateKey } = await createServerKeyPair()
    const longPassword = 'x'.repeat(300)

    const result = await encryptWithPublicKey(longPassword, pem, 'kid-2')
    const [version, wrappedKey, nonce, sealed] = result.password_encrypted.split('.')

    expect(version).toBe('v2')
    const secret = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP', label: new TextEncoder().encode('password-v2') },
      privateKey,
      fromBase64(wrappedKey ?? ''),
    )
    const aesKey = await crypto.subtle.importKey('raw', secret, 'AES-GCM', false, ['decrypt'])
    const plain = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: fromBase64(nonce ?? ''),
        additionalData: new TextEncoder().encode('password-v2:kid-2'),
      },
      aesKey,
      fromBase64(sealed ?? ''),
    )
    expect(new TextDecoder().decode(plain)).toBe(longPassword)
  })
})
