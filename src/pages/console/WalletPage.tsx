import { GiftOutlined, LinkOutlined } from '@ant-design/icons'
import { App as AntdApp, Alert, Button, Input, InputNumber, Radio, Skeleton, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'

import { fetchCurrentUser } from '@/features/auth/api'
import { useAuthStore } from '@/features/auth/auth-store'
import { PageHead } from '@/features/console/components/PageHead'
import { useSystemStatus } from '@/features/auth/hooks'
import { formatQuota, usdExchangeRate, useQuotaFormat } from '@/features/console/quota'
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
import { amountOptions, creemProducts, discountFor, moneyText, paymentMethods } from '@/features/wallet/topup'
import { errorMessage } from '@/shared/api/client'
import { usePageTitle } from '@/shared/hooks/use-page-title'
import { useT } from '@/shared/i18n'

import styles from './WalletPage.module.css'

const STATUS: Record<string, { label: [string, string]; color?: string }> = {
  success: { label: ['已到账', 'Paid'] as [string, string], color: 'success' },
  pending: { label: ['待支付', 'Pending'] as [string, string], color: 'processing' },
  expired: { label: ['已过期', 'Expired'] as [string, string] },
}

/**
 * 充值以「份」下单，1 份 = ¥1（Stripe 价格按人民币 ¥1/份，后台充值倍率保证 1 份到账 ¥1 余额）。
 * 页面上用户直接填人民币金额，金额就是份数。
 */
function amountLabel(yuan: number, format: QuotaFormat, usdRate: number): string {
  return formatQuota((yuan / usdRate) * format.perUnit, format)
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function OnlineTopup({ info, format, usdRate }: { info: TopupInfo; format: QuotaFormat; usdRate: number }) {
  const t = useT()
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
      message.error(t(`${method.name} 最少充值 ${amountLabel(method.min, format, usdRate)}`, `${method.name} minimum is ${amountLabel(method.min, format, usdRate)}`))
      return
    }
    setPaying(method.type)
    try {
      openPayment(await createPayment(method.type, amount))
    } catch (error: unknown) {
      message.error(errorMessage(error, t('下单失败，请稍后重试', 'Could not create the order — try again later')))
      setPaying(null)
    }
  }

  async function buy(productId: string) {
    setPaying(productId)
    try {
      openPayment(await createCreemPayment(productId))
    } catch (error: unknown) {
      message.error(errorMessage(error, t('下单失败，请稍后重试', 'Could not create the order — try again later')))
      setPaying(null)
    }
  }

  return (
    <>
      {methods.length > 0 ? (
        <div className={styles.topup}>
          <div className={styles.field}>
            <span className={styles.label}>{t('充值额度', 'Amount')}</span>
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
                      <strong>{amountLabel(value, format, usdRate)}</strong>
                      {rate < 1 ? <span>{t(`${Math.round(rate * 100) / 10} 折`, `${Math.round(rate * 1000) / 100}% off`)}</span> : null}
                    </button>
                  )
                })}
              </div>
            ) : null}
            <Space.Compact className={styles.amountInput}>
              <InputNumber
                min={1}
                precision={0}
                value={amount}
                onChange={(value) => setAmount(typeof value === 'number' && value > 0 ? value : null)}
                placeholder={t('自定义金额', 'Custom amount')}
                aria-label={t('自定义充值金额', 'Custom top-up amount')}
                style={{ width: '100%' }}
              />
              <Space.Addon>{t('元', 'CNY')}</Space.Addon>
            </Space.Compact>
            {method && amount ? (
              <span className={styles.hint}>
                {t(`到账 ${amountLabel(amount, format, usdRate)} 余额；${method.name} 最少 ¥${method.min}`, `Credits ${amountLabel(amount, format, usdRate)}. ${method.name} minimum: ¥${method.min}.`)}
              </span>
            ) : null}
          </div>

          <div className={styles.field}>
            <span className={styles.label}>{t('支付方式', 'Payment method')}</span>
            <Radio.Group
              optionType="button"
              value={method?.type}
              onChange={(event) => setMethodChoice(String(event.target.value))}
              options={methods.map((item) => ({ value: item.type, label: item.name }))}
            />
          </div>

          <div className={styles.payRow}>
            <span className={styles.quote}>
              {t('应付', 'Total')}
              <strong>
                {!valid ? '—' : quote.isFetching ? t('计算中…', '…') : quote.isError || !quote.data ? '—' : moneyText(quote.data, method?.type, format, usdRate)}
              </strong>
            </span>
            <Button type="primary" size="large" loading={paying === method?.type} disabled={!valid || quote.isError} onClick={() => void pay()}>
              {t('前往支付', 'Pay now')}
            </Button>
          </div>
          {quote.isError ? <Alert type="error" showIcon title={errorMessage(quote.error, t('暂时无法计算金额', 'Could not calculate the amount right now'))} /> : null}
          <p className={styles.hint}>{t('点击后会跳转到支付页面，付款成功后额度自动到账；实际币种和金额以支付页面为准。', 'You will be taken to the payment page; credit is added automatically after payment. The payment page shows the final currency and amount.')}</p>
        </div>
      ) : null}

      {products.length > 0 ? (
        <div className={styles.products}>
          {products.map((product) => (
            <div key={product.productId} className={styles.product}>
              <strong>{product.name}</strong>
              <span>{t('到账', 'Credit')} {formatQuota(product.quota, format)}</span>
              <Button loading={paying === product.productId} onClick={() => void buy(product.productId)}>
                {t('购买', 'Buy')} {product.currency === 'EUR' ? '€' : '$'}{product.price}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </>
  )
}

function Redeem({ info, format, onDone }: { info: TopupInfo; format: QuotaFormat; onDone: () => void }) {
  const t = useT()
  const { message } = AntdApp.useApp()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!code.trim()) {
      setError(t('请输入兑换码', 'Enter a redemption code'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const quota = await redeemCode(code)
      message.success(t(`兑换成功，到账 ${formatQuota(quota, format)}`, `Redeemed — ${formatQuota(quota, format)} credited`))
      setCode('')
      onDone()
    } catch (caught: unknown) {
      setError(errorMessage(caught, t('兑换失败，请检查兑换码', 'Redemption failed — check the code')))
    } finally {
      setBusy(false)
    }
  }

  if (!info.enable_redemption) {
    return <p className={styles.hint}>{t('站点暂未开放兑换码充值。', 'Redemption codes are not enabled on this site.')}</p>
  }

  return (
    <div className={styles.redeem}>
      <div className={styles.redeemRow}>
        <Input
          value={code}
          onChange={(event) => { setCode(event.target.value); setError(null) }}
          placeholder={t('粘贴兑换码', 'Paste redemption code')}
          allowClear
          onPressEnter={() => void submit()}
          aria-label={t('兑换码', 'Redemption code')}
        />
        <Button type="primary" loading={busy} onClick={() => void submit()}>{t('兑换', 'Redeem')}</Button>
      </div>
      {error ? <Alert type="error" showIcon title={error} /> : null}
    </div>
  )
}

export function WalletPage() {
  const t = useT()
  usePageTitle(t('充值与账单', 'Billing'))
  const queryClient = useQueryClient()
  const storedUser = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const userId = storedUser?.id
  const format = useQuotaFormat()
  const usdRate = usdExchangeRate(useSystemStatus().data)
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
      title: t('时间', 'Time'),
      dataIndex: 'create_time',
      render: (value: number) => <span className={styles.mono}>{dayjs.unix(value).format('YYYY-MM-DD HH:mm')}</span>,
    },
    {
      title: t('订单号', 'Order'),
      dataIndex: 'trade_no',
      render: (value: string) => <Typography.Text className={styles.mono} copyable={{ text: value }}>{value}</Typography.Text>,
    },
    { title: t('支付方式', 'Method'), dataIndex: 'payment_method', render: (value: string) => value || '—' },
    {
      title: t('到账额度', 'Credit'),
      dataIndex: 'amount',
      align: 'right',
      render: (value: number) => <span className={styles.mono}>{amountLabel(value, format, usdRate)}</span>,
    },
    {
      title: t('实付', 'Paid'),
      dataIndex: 'money',
      align: 'right',
      // Stripe 订单里 money 记的是到账美元额度，实付人民币就是份数（1 份 = ¥1）
      render: (value: number, record) => <span className={styles.mono}>{moneyText(record.payment_method === 'stripe' ? record.amount : value || 0, record.payment_method, format, usdRate)}</span>,
    },
    {
      title: t('状态', 'Status'),
      dataIndex: 'status',
      render: (value: string) => <Tag color={STATUS[value]?.color}>{t(...(STATUS[value]?.label ?? [value, value]))}</Tag>,
    },
  ]

  const topupInfo = info.data
  const hasOnline = topupInfo ? paymentMethods(topupInfo).length > 0 || creemProducts(topupInfo).length > 0 : false

  return (
    <div>
      <PageHead title={t('充值与账单', 'Billing')} description={t('给账号充值额度，所有密钥共用这份余额。', 'Top up your account; all keys share this balance.')} />

      <div className={styles.balance}>
        <div>
          <span>{t('可用余额', 'Balance')}</span>
          <strong>{formatQuota(user?.quota, format)}</strong>
        </div>
        <div>
          <span>{t('累计消费', 'Total spent')}</span>
          <strong>{formatQuota(user?.used_quota, format)}</strong>
        </div>
      </div>

      {info.isError ? (
        <Alert type="error" showIcon title={t('充值配置暂时获取不到', 'Could not load top-up settings')} action={<Button size="small" onClick={() => void info.refetch()}>{t('重试', 'Retry')}</Button>} />
      ) : info.isPending || !topupInfo ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : (
        <div className={styles.grid}>
          <section className={styles.panel} aria-labelledby="online-title">
            <h2 id="online-title">{t('在线充值', 'Top up online')}</h2>
            {hasOnline ? (
              <OnlineTopup info={topupInfo} format={format} usdRate={usdRate} />
            ) : (
              <p className={styles.hint}>
                {topupInfo.enable_redemption ? t('站点暂未开通在线支付，可以使用右侧的兑换码充值。', 'Online payment is not enabled — use a redemption code on the right.') : t('站点暂未开通在线充值，请联系站长。', 'Online top-up is not enabled — contact the administrator.')}
              </p>
            )}
          </section>
          <section className={styles.panel} aria-labelledby="redeem-title">
            <h2 id="redeem-title"><GiftOutlined /> {t('兑换码', 'Redemption code')}</h2>
            <Redeem info={topupInfo} format={format} onDone={afterRedeem} />
            {topupInfo.topup_link && /^https?:\/\//.test(topupInfo.topup_link) ? (
              <a className={styles.buyLink} href={topupInfo.topup_link} target="_blank" rel="noopener noreferrer">
                <LinkOutlined /> {t('去购买兑换码', 'Buy a code')}
              </a>
            ) : null}
          </section>
        </div>
      )}

      <section className={styles.historySection} aria-labelledby="history-title">
        <h2 id="history-title">{t('充值记录', 'Top-up history')}</h2>
        {history.isError ? (
          <Alert type="error" showIcon title={t('充值记录暂时获取不到', 'Could not load top-up history')} action={<Button size="small" onClick={() => void history.refetch()}>{t('重试', 'Retry')}</Button>} />
        ) : (
          <Table<TopupRecord>
            className={styles.table}
            rowKey="id"
            columns={columns}
            dataSource={history.data?.items ?? []}
            loading={history.isFetching}
            scroll={{ x: 760 }}
            locale={{ emptyText: t('还没有充值记录', 'No top-ups yet') }}
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
