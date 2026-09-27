import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'

/**
 * 模型 / 厂商图标，和 New API 后台用的是同一套图标库（@lobehub/icons），
 * 名称写法也一致：`OpenAI`、`Claude.Color`、`DeepSeek.Color`……
 * 后台给模型或厂商配了什么图标，前台就显示什么；没有或找不到时退回首字母。
 *
 * 每个图标单独按需加载，不会把几百个图标一次性打进首屏。
 */
type IconComponent = ComponentType<{ size?: number | string }>

const LOADERS = import.meta.glob<{ default: IconComponent }>(
  '/node_modules/@lobehub/icons/es/*/components/{Mono,Color}.js',
)

const CACHE = new Map<string, IconComponent>()

/** 按 New API 的规则解析图标名：默认单色，写了 .Color 且有彩色版才用彩色 */
function resolveIconPath(name: string | null | undefined): string | null {
  const trimmed = name?.trim()
  if (!trimmed) return null
  const [base, variant] = trimmed.split('.')
  if (!base || !/^[A-Za-z0-9]+$/.test(base)) return null
  const path = (kind: string) => `/node_modules/@lobehub/icons/es/${base}/components/${kind}.js`
  if (variant === 'Color' && LOADERS[path('Color')]) return path('Color')
  return LOADERS[path('Mono')] ? path('Mono') : null
}

interface BrandIconProps {
  /** New API 里配置的图标名 */
  icon?: string | null
  /** 找不到图标时用首字母兜底 */
  fallback: string
  size?: number
  className?: string
}

export function BrandIcon({ icon, fallback, size = 18, className }: BrandIconProps) {
  const path = resolveIconPath(icon)
  const [loaded, setLoaded] = useState<{ path: string; Icon: IconComponent } | null>(() => {
    const cached = path ? CACHE.get(path) : undefined
    return path && cached ? { path, Icon: cached } : null
  })

  useEffect(() => {
    if (!path) return
    const cached = CACHE.get(path)
    let active = true
    const load = cached ? Promise.resolve(cached) : LOADERS[path]!().then((module) => module.default)
    load
      .then((Icon) => {
        CACHE.set(path, Icon)
        if (active) setLoaded({ path, Icon })
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [path])

  const Icon = loaded && loaded.path === path ? loaded.Icon : null
  return (
    <span className={className} aria-hidden="true">
      {Icon ? <Icon size={size} /> : <strong style={{ fontSize: size * 0.72 }}>{fallback.slice(0, 1).toUpperCase()}</strong>}
    </span>
  )
}
