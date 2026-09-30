import { useQuery } from '@tanstack/react-query'

/** 发版流程（coil-customization）上传到服务器的 /downloads/latest.json */
export type DesktopPlatform = 'mac-arm64' | 'win-x64' | 'win-arm64'

export interface DesktopFile {
  platform: DesktopPlatform
  name: string
  url: string
  size: number
  sha256: string
}

export interface DesktopRelease {
  version: string
  tag: string
  publishedAt: string
  files: DesktopFile[]
}

const PLATFORMS: DesktopPlatform[] = ['mac-arm64', 'win-x64', 'win-arm64']

/** 只认结构完整的数据；其他情况（没发过版、被网关回了首页 HTML 等）一律当作“暂无下载” */
export function parseRelease(raw: unknown): DesktopRelease | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Partial<DesktopRelease>
  if (typeof data.version !== 'string' || !Array.isArray(data.files)) return null
  const files = data.files.filter(
    (file): file is DesktopFile =>
      Boolean(file) &&
      PLATFORMS.includes(file.platform) &&
      typeof file.url === 'string' &&
      file.url.startsWith('/downloads/') &&
      typeof file.name === 'string' &&
      typeof file.size === 'number',
  )
  if (!files.length) return null
  return { version: data.version, tag: data.tag ?? '', publishedAt: data.publishedAt ?? '', files }
}

/** 当前访问设备最可能用哪个包；手机、平板不猜，返回 null 让页面列出全部 */
export function detectPlatform(userAgent: string): DesktopPlatform | null {
  if (/android|iphone|ipad|ipod|mobile/i.test(userAgent)) return null
  if (/macintosh|mac os x/i.test(userAgent)) return 'mac-arm64'
  if (/windows/i.test(userAgent)) return /arm64|aarch64/i.test(userAgent) ? 'win-arm64' : 'win-x64'
  return null
}

export function formatFileSize(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} MB`
}

export const PLATFORM_LABEL: Record<DesktopPlatform, [string, string]> = {
  'mac-arm64': ['macOS（Apple 芯片）', 'macOS (Apple silicon)'],
  'win-x64': ['Windows（x64）', 'Windows (x64)'],
  'win-arm64': ['Windows（ARM）', 'Windows (ARM)'],
}

async function fetchRelease(): Promise<DesktopRelease | null> {
  const response = await fetch('/downloads/latest.json', { cache: 'no-cache' })
  if (!response.ok) return null
  try {
    return parseRelease(await response.json())
  } catch {
    return null
  }
}

export function useDesktopRelease() {
  return useQuery({ queryKey: ['desktop-release'], queryFn: fetchRelease, staleTime: 5 * 60_000, retry: false })
}
