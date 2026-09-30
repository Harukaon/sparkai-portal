import { describe, expect, it } from 'vitest'

import { detectPlatform, formatFileSize, parseRelease } from './release'

const file = (platform: string, url = '/downloads/v1/a.exe') => ({ platform, name: 'a', url, size: 1, sha256: 'x' })

describe('parseRelease', () => {
  it('结构完整时返回数据', () => {
    const release = parseRelease({ version: '0.1.0-beta.7', tag: 'v0.1.0-beta.7', files: [file('win-x64')] })
    expect(release?.files).toHaveLength(1)
  })
  it('没发过版、返回了别的内容时当作暂无下载', () => {
    expect(parseRelease(null)).toBeNull()
    expect(parseRelease('<html>')).toBeNull()
    expect(parseRelease({ version: '1', files: [] })).toBeNull()
  })
  it('过滤掉不在下载目录下的链接和未知平台', () => {
    const release = parseRelease({ version: '1', files: [file('win-x64', 'https://evil.example/a.exe'), file('linux'), file('mac-arm64')] })
    expect(release?.files.map((item) => item.platform)).toEqual(['mac-arm64'])
  })
})

describe('detectPlatform', () => {
  it('按系统选包，手机不猜', () => {
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('mac-arm64')
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('win-x64')
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; ARM64)')).toBe('win-arm64')
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile')).toBeNull()
  })
  it('文件大小', () => expect(formatFileSize(160 * 1024 * 1024)).toBe('160 MB'))
})
