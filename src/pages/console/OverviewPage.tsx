import { Alert, Button, Skeleton } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { fetchCurrentUser } from '@/features/auth/api'
import { useAuthStore } from '@/features/auth/auth-store'
import { useSystemStatus } from '@/features/auth/hooks'
import { PageHead } from '@/features/console/components/PageHead'
import { UsageLogTable } from '@/features/console/components/UsageLogTable'
import { formatQuota, useQuotaFormat } from '@/features/console/quota'
import type { QuotaFormat } from '@/features/console/quota'
import { fetchUsageLogs, fetchWeeklyUsage } from '@/features/console/usage'
import type { DayUsage } from '@/features/console/usage'
import { usePageTitle } from '@/shared/hooks/use-page-title'

import styles from './OverviewPage.module.css'

const CHART_HEIGHT = 250
const CHART_LEFT = 104
const CHART_RIGHT = 16
const CHART_TOP = 14
const CHART_BOTTOM = 210
const CHART_TICKS = 4

function WeeklySpendChart({ days, peak, format }: { days: DayUsage[]; peak: number; format: QuotaFormat }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(720)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(Math.round(entry.contentRect.width), 280))
    })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  const chartWidth = Math.max(width, CHART_LEFT + CHART_RIGHT + 1)
  const plotWidth = chartWidth - CHART_LEFT - CHART_RIGHT
  const plotHeight = CHART_BOTTOM - CHART_TOP
  const chartMax = peak > 0 ? peak * 1.15 : format.perUnit / format.rate
  const points = days.map((day, index) => ({
    day,
    x: days.length > 1 ? CHART_LEFT + (plotWidth * index) / (days.length - 1) : CHART_LEFT + plotWidth / 2,
    y: CHART_TOP + ((chartMax - day.quota) / chartMax) * plotHeight,
  }))
  const linePath = points.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  const lastPoint = points.at(-1)
  const firstPoint = points[0]
  const areaPath = firstPoint && lastPoint
    ? `${linePath} L ${lastPoint.x} ${CHART_BOTTOM} L ${firstPoint.x} ${CHART_BOTTOM} Z`
    : ''
  const tickValues = Array.from({ length: CHART_TICKS + 1 }, (_, index) => chartMax * (1 - index / CHART_TICKS))
  const chartDescription = days.map((day) =>
    `${day.label} 消费 ${formatQuota(day.quota, format)}，${day.count} 次请求`,
  ).join('；')

  return (
    <div className={styles.chartFrame} ref={frameRef}>
      <svg
        className={styles.chart}
        width={chartWidth}
        height={CHART_HEIGHT}
        viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
        role="img"
        aria-label={`近7天消费趋势图，纵轴为人民币，横轴为日期。${chartDescription}`}
      >
        {tickValues.map((value, index) => {
          const y = CHART_TOP + (plotHeight * index) / CHART_TICKS
          return (
            <g key={index}>
              <line className={index === CHART_TICKS ? styles.chartBaseline : styles.chartGrid} x1={CHART_LEFT} y1={y} x2={chartWidth - CHART_RIGHT} y2={y} />
              <text className={styles.chartAxisLabel} x={CHART_LEFT - 12} y={y}>{formatQuota(value, format)}</text>
            </g>
          )
        })}
        <path className={styles.chartArea} d={areaPath} />
        <path className={styles.chartLine} d={linePath} />
        {points.map(({ day, x, y }) => (
          <g key={day.key}>
            <circle className={styles.chartPoint} cx={x} cy={y} r={4}>
              <title>{`${day.label}：消费 ${formatQuota(day.quota, format)}，${day.count} 次请求`}</title>
            </circle>
            <text className={styles.chartDayLabel} x={x} y={CHART_HEIGHT - 8}>{day.label}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export function OverviewPage() {
  usePageTitle('总览')
  const storedUser = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const userId = storedUser?.id
  const system = useSystemStatus()
  const format = useQuotaFormat()
  const exportEnabled = system.data?.enable_data_export !== false

  const profile = useQuery({
    queryKey: ['current-user', userId],
    queryFn: fetchCurrentUser,
    enabled: Boolean(userId),
  })
  const weekly = useQuery({
    queryKey: ['weekly-usage', userId],
    queryFn: () => fetchWeeklyUsage(),
    enabled: Boolean(userId) && exportEnabled,
    staleTime: 60_000,
  })
  const recent = useQuery({
    queryKey: ['usage-logs', userId, 'recent'],
    queryFn: () => fetchUsageLogs({ type: 2 }, 1, 5),
    enabled: Boolean(userId),
  })

  useEffect(() => {
    if (profile.data) updateUser(profile.data)
  }, [profile.data, updateUser])

  const user = profile.data ?? storedUser
  const days = weekly.data ?? []
  const peak = Math.max(0, ...days.map((day) => day.quota))
  const weekQuota = days.reduce((sum, day) => sum + day.quota, 0)
  const weekCount = days.reduce((sum, day) => sum + day.count, 0)

  const stats = [
    { label: '可用余额', value: formatQuota(user?.quota, format) },
    { label: '累计消费', value: formatQuota(user?.used_quota, format) },
    { label: '累计请求', value: (user?.request_count ?? 0).toLocaleString('zh-CN') + ' 次' },
    { label: '当前分组', value: user?.group || 'default' },
  ]

  return (
    <div>
      <PageHead
        title="总览"
        description="余额、消费和最近调用，一眼看清账号状态。"
        actions={
          <>
            <Link to="/models"><Button>查看模型价格</Button></Link>
            <Link to="/console/keys"><Button type="primary">管理 API 密钥</Button></Link>
          </>
        }
      />

      {profile.isError ? (
        <Alert
          className={styles.alert}
          type="warning"
          showIcon
          title="账号信息没有刷新成功，以下为登录时的数据"
          action={<Button size="small" onClick={() => void profile.refetch()}>重试</Button>}
        />
      ) : null}

      <dl className={styles.stats}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.stat}>
            <dt>{stat.label}</dt>
            <dd>{profile.isPending && !storedUser ? <Skeleton.Input active size="small" /> : stat.value}</dd>
          </div>
        ))}
      </dl>

      <section className={styles.panel} aria-labelledby="weekly-title">
        <div className={styles.panelHead}>
          <h2 id="weekly-title">近 7 天消费</h2>
          {exportEnabled && weekly.data ? (
            <span>{formatQuota(weekQuota, format)} · {weekCount.toLocaleString('zh-CN')} 次请求</span>
          ) : null}
        </div>
        {!exportEnabled ? (
          <p className={styles.note}>站点没有开启用量统计，可以在请求记录里查看每一次调用。</p>
        ) : weekly.isPending ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : weekly.isError ? (
          <Alert type="error" showIcon title="用量统计暂时获取不到" action={<Button size="small" onClick={() => void weekly.refetch()}>重试</Button>} />
        ) : (
          <>
            <WeeklySpendChart days={days} peak={peak} format={format} />
            <p className={styles.note}>
              {weekQuota > 0 ? '统计按小时汇总，可能比请求记录晚几分钟。' : '近 7 天还没有消费。'}
            </p>
          </>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="recent-title">
        <div className={styles.panelHead}>
          <h2 id="recent-title">最近调用</h2>
          <Link to="/console/logs">查看全部</Link>
        </div>
        {recent.isError ? (
          <Alert type="error" showIcon title="最近调用暂时获取不到" action={<Button size="small" onClick={() => void recent.refetch()}>重试</Button>} />
        ) : (
          <UsageLogTable
            logs={recent.data?.items ?? []}
            format={format}
            loading={recent.isPending}
            emptyText="还没有调用记录。用 API 密钥发起第一次请求后，会显示在这里。"
          />
        )}
      </section>
    </div>
  )
}
