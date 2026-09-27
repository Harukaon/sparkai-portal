import { GiftOutlined, LinkOutlined } from '@ant-design/icons'
import { App as AntdApp, Alert, Button, Input, InputNumber, Radio, Skeleton, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'

import { fetchCurrentUser } from '@/features/auth/api'
import { useAuthStore } from '@/features/auth/auth-store'
import { PageHead } from '@/features/console/components/PageHead'
import { formatQuota, useQuotaFormat } from '@/features/console/quota'
import type { QuotaFormat } from '@/features/console/quota'
import {
  createCreemPayment,
  createPayment,
  fetchTopupHistory,
  fetchTopupInfo,
  openPayment,
  quotePayment,
  redeemCode,
} from '@/features/wallet/api'
import type { TopupInfo, TopupRecord } from '@/features/wallet/api'
import { amountOptions, creemProducts, discountFor, paymentMethods } from '@/features/wallet/topup'
import { errorMessage } from '@/shared/api/client'
import { usePageTitle } from '@/shared/hooks/use-page-title'

import styles from './WalletPage.module.css'

const STATUS: Record<string, { label: string; color?: string }> = {
  success: { label: '已到账', color: 'success' },
  pending: { label: '待支付', color: 'processing' },
  expired: { label: '已过期' },
}

/** 充值数量：金额模式下 1 = 1 美元额度，额度模式下就是额度点数 */
function amountLabel(amount: number, format: QuotaFormat): string {
  return format.unit === 'TOKENS'
    ? `${amount.toLocaleString('zh-CN')} 额度`
    : formatQuota(amount * format.perUnit, format)
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function OnlineTopup({ info, format }: { info: TopupInfo; format: QuotaFormat }) {
  const { message } = AntdApp.useApp()
  const methods = paymentMethods(info)
  const presets = amountOptions(info)
  const products = creemProducts(info)
  const [methodChoice, setMethodChoice] = useState('')
  const [amount, setAmount] = useState<number | null>(presets[0] ?? null)
  const [paying, setPaying] = useState<string | null>(null)
  const method = methods.find((item) => item.type === methodChoice) ?? methods[0]
  const debouncedAmount = useDebounced(amount, 400)
  const valid = Boolean(method && debouncedAmount && debouncedAmount >= method.min)

  const quote = useQuery({
    queryKey: ['topup-quote', method?.type, debouncedAmount],
    queryFn: () => quotePayment(method!.type, debouncedAmount!),
    enabled: valid,
    retry: false,
    staleTime: 30_000,
  })

  async function pay() {
    if (!method || !amount) return
    if (amount < method.min) {
      message.error(`${method.name} 最少充值 ${amountLabel(method.min, format)}`)
      return
    }
    setPaying(method.type)
    try {
      openPayment(await createPayment(method.type, amount))
    } catch (error: unknown) {
      message.error(errorMessage(error, '下单失败，请稍后重试'))
      setPaying(null)
    }
  }

  async function buy(productId: string) {
    setPaying(productId)
    try {
      openPayment(await createCreemPayment(productId))
    } catch (error: unknown) {
      message.error(errorMessage(error, '下单失败，请稍后重试'))
      setPaying(null)
    }
  }

  return (
    <>
      {methods.length > 0 ? (
        <div className={styles.topup}>
          <div className={styles.field}>
            <span className={styles.label}>充值额度</span>
            {presets.length > 0 ? (
              <div className={styles.presets}>
                {presets.map((value) => {
                  const rate = discountFor(info, value)
                  return (
                    <button
                      key={value}
                      type="button"
                      className={`${styles.preset} ${amount === value ? styles.presetActive : ''}`}
                      aria-pressed={amount === value}
                      onClick={() => setAmount(value)}
                    >
                      <strong>{amountLabel(value, format)}</strong>
                      {rate < 1 ? <span>{Math.round(rate * 100) / 10} 折</span> : null}
                    </button>
                  )
                })}
              </div>
            ) : null}
            <InputNumber
              className={styles.amountInput}
              min={1}
              precision={0}
              value={amount}
              onChange={(value) => setAmount(typeof value === 'number' ? value : null)}
              placeholder="自定义数量"
              addonAfter={format.unit === 'TOKENS' ? '额度' : '美元额度'}
              aria-label="自定义充值数量"
            />
            {method ? <span className={styles.hint}>{method.name} 最少充值 {amountLabel(method.min, format)}</span> : null}
          </div>

          <div className={styles.field}>
            <span className={styles.label}>支付方式</span>
            <Radio.Group
              optionType="button"
              value={method?.type}
              onChange={(event) => setMethodChoice(String(event.target.value))}
              options={methods.map((item) => ({ value: item.type, label: item.name }))}
            />
          </div>

          <div className={styles.payRow}>
            <span className={styles.quote}>
              应付
              <strong>
                {!valid ? '—' : quote.isFetching ? '计算中…' : quote.isError ? '—' : quote.data ?? '—'}
              </strong>
            </span>
            <Button type="primary" size="large" loading={paying === method?.type} disabled={!valid || quote.isError} onClick={() => void pay()}>
              前往支付
            </Button>
          </div>
          {quote.isError ? <Alert type="error" showIcon title={errorMessage(quote.error, '暂时无法计算金额')} /> : null}
          <p className={styles.hint}>点击后会跳转到支付页面，付款成功后额度自动到账；实际币种和金额以支付页面为准。</p>
        </div>
      ) : null}

      {products.length > 0 ? (
        <div className={styles.products}>
          {products.map((product) => (
            <div key={product.productId} className={styles.product}>
              <strong>{product.name}</strong>
              <span>到账 {formatQuota(product.quota, format)}</span>
              <Button loading={paying === product.productId} onClick={() => void buy(product.productId)}>
                {product.currency === 'EUR' ? '€' : '$'}{product.price} 购买
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </>
  )
}

function Redeem({ info, format, onDone }: { info: TopupInfo; format: QuotaFormat; onDone: () => void }) {
  const { message } = AntdApp.useApp()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!code.trim()) {
      setError('请输入兑换码')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const quota = await redeemCode(code)
      message.success(`兑换成功，到账 ${formatQuota(quota, format)}`)
      setCode('')
      onDone()
    } catch (caught: unknown) {
      setError(errorMessage(caught, '兑换失败，请检查兑换码'))
    } finally {
      setBusy(false)
    }
  }

  if (!info.enable_redemption) {
    return <p className={styles.hint}>站点暂未开放兑换码充值。</p>
  }

  return (
    <div className={styles.redeem}>
      <div className={styles.redeemRow}>
        <Input
          value={code}
          onChange={(event) => { setCode(event.target.value); setError(null) }}
          placeholder="粘贴兑换码"
          allowClear
          onPressEnter={() => void submit()}
          aria-label="兑换码"
        />
        <Button type="primary" loading={busy} onClick={() => void submit()}>兑换</Button>
      </div>
      {error ? <Alert type="error" showIcon title={error} /> : null}
    </div>
  )
}

export function WalletPage() {
  usePageTitle('充值与账单')
  const queryClient = useQueryClient()
  const storedUser = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const userId = storedUser?.id
  const format = useQuotaFormat()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const profile = useQuery({ queryKey: ['current-user', userId], queryFn: fetchCurrentUser, enabled: Boolean(userId) })
  const info = useQuery({ queryKey: ['topup-info', userId], queryFn: fetchTopupInfo, enabled: Boolean(userId) })
  const history = useQuery({
    queryKey: ['topup-history', userId, page, pageSize],
    queryFn: () => fetchTopupHistory(page, pageSize),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  })

  useEffect(() => {
    if (profile.data) updateUser(profile.data)
  }, [profile.data, updateUser])

  const user = profile.data ?? storedUser

  function afterRedeem() {
    void queryClient.invalidateQueries({ queryKey: ['current-user', userId] })
    void queryClient.invalidateQueries({ queryKey: ['topup-history', userId] })
    void queryClient.invalidateQueries({ queryKey: ['usage-logs', userId] })
  }

  const columns: ColumnsType<TopupRecord> = [
    {
      title: '时间',
      dataIndex: 'create_time',
      render: (value: number) => <span className={styles.mono}>{dayjs.unix(value).format('YYYY-MM-DD HH:mm')}</span>,
    },
    {
      title: '订单号',
      dataIndex: 'trade_no',
      render: (value: string) => <Typography.Text className={styles.mono} copyable={{ text: value }}>{value}</Typography.Text>,
    },
    { title: '支付方式', dataIndex: 'payment_method', render: (value: string) => value || '—' },
    {
      title: '到账额度',
      dataIndex: 'amount',
      align: 'right',
      render: (value: number) => <span className={styles.mono}>{formatQuota(value * format.perUnit, format)}</span>,
    },
    {
      title: '实付',
      dataIndex: 'money',
      align: 'right',
      render: (value: number) => <span className={styles.mono}>{Number(value || 0).toFixed(2)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (value: string) => <Tag color={STATUS[value]?.color}>{STATUS[value]?.label ?? value}</Tag>,
    },
  ]

  const topupInfo = info.data
  const hasOnline = topupInfo ? paymentMethods(topupInfo).length > 0 || creemProducts(topupInfo).length > 0 : false

  return (
    <div>
      <PageHead title="充值与账单" description="给账号充值额度，所有密钥共用这份余额。" />

      <div className={styles.balance}>
        <div>
          <span>可用余额</span>
          <strong>{formatQuota(user?.quota, format)}</strong>
        </div>
        <div>
          <span>累计消费</span>
          <strong>{formatQuota(user?.used_quota, format)}</strong>
        </div>
      </div>

      {info.isError ? (
        <Alert type="error" showIcon title="充值配置暂时获取不到" action={<Button size="small" onClick={() => void info.refetch()}>重试</Button>} />
      ) : info.isPending || !topupInfo ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : (
        <div className={styles.grid}>
          <section className={styles.panel} aria-labelledby="online-title">
            <h2 id="online-title">在线充值</h2>
            {hasOnline ? (
              <OnlineTopup info={topupInfo} format={format} />
            ) : (
              <p className={styles.hint}>
                {topupInfo.enable_redemption ? '站点暂未开通在线支付，可以使用右侧的兑换码充值。' : '站点暂未开通在线充值，请联系站长。'}
              </p>
            )}
          </section>
          <section className={styles.panel} aria-labelledby="redeem-title">
            <h2 id="redeem-title"><GiftOutlined /> 兑换码</h2>
            <Redeem info={topupInfo} format={format} onDone={afterRedeem} />
            {topupInfo.topup_link && /^https?:\/\//.test(topupInfo.topup_link) ? (
              <a className={styles.buyLink} href={topupInfo.topup_link} target="_blank" rel="noopener noreferrer">
                <LinkOutlined /> 去购买兑换码
              </a>
            ) : null}
          </section>
        </div>
      )}

      <section className={styles.historySection} aria-labelledby="history-title">
        <h2 id="history-title">充值记录</h2>
        {history.isError ? (
          <Alert type="error" showIcon title="充值记录暂时获取不到" action={<Button size="small" onClick={() => void history.refetch()}>重试</Button>} />
        ) : (
          <Table<TopupRecord>
            className={styles.table}
            rowKey="id"
            columns={columns}
            dataSource={history.data?.items ?? []}
            loading={history.isFetching}
            scroll={{ x: 760 }}
            locale={{ emptyText: '还没有充值记录' }}
            pagination={{
              current: page,
              pageSize,
              total: history.data?.total ?? 0,
              hideOnSinglePage: true,
              onChange: (nextPage, nextSize) => {
                setPage(nextSize === pageSize ? nextPage : 1)
                setPageSize(nextSize)
              },
            }}
          />
        )}
      </section>
    </div>
  )
}
