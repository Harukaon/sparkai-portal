import { App as AntdApp, Alert, Button, InputNumber, Skeleton, Space, Typography } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { fetchCurrentUser } from '@/features/auth/api'
import { useAuthStore } from '@/features/auth/auth-store'
import { PageHead } from '@/features/console/components/PageHead'
import { amountToQuota, formatQuota, quotaToAmount, useQuotaFormat } from '@/features/console/quota'
import { fetchInviteCode, inviteLink, transferInviteReward } from '@/features/invite/api'
import { errorMessage } from '@/shared/api/client'
import { usePageTitle } from '@/shared/hooks/use-page-title'

import styles from './InvitePage.module.css'

export function InvitePage() {
  usePageTitle('邀请奖励')
  const { message } = AntdApp.useApp()
  const queryClient = useQueryClient()
  const storedUser = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const userId = storedUser?.id
  const format = useQuotaFormat()
  const [amount, setAmount] = useState<number | null>(null)
  const [transferring, setTransferring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const code = useQuery({ queryKey: ['invite-code', userId], queryFn: fetchInviteCode, enabled: Boolean(userId) })
  const profile = useQuery({ queryKey: ['current-user', userId], queryFn: fetchCurrentUser, enabled: Boolean(userId) })

  useEffect(() => {
    if (profile.data) updateUser(profile.data)
  }, [profile.data, updateUser])

  const user = profile.data ?? storedUser
  const pending = user?.aff_quota ?? 0
  const minQuota = format.perUnit
  const pendingAmount = Number(quotaToAmount(pending, format).toFixed(2))
  const minAmount = Number(quotaToAmount(minQuota, format).toFixed(2))
  const link = code.data ? inviteLink(window.location.origin, code.data) : ''

  async function transfer() {
    const value = amount ?? pendingAmount
    const quota = Math.min(amountToQuota(value, format), pending)
    if (quota < minQuota) {
      setError(`每次最少转入 ${formatQuota(minQuota, format)}`)
      return
    }
    setTransferring(true)
    setError(null)
    try {
      await transferInviteReward(quota)
      message.success(`已转入余额 ${formatQuota(quota, format)}`)
      setAmount(null)
      await queryClient.invalidateQueries({ queryKey: ['current-user', userId] })
    } catch (caught: unknown) {
      setError(errorMessage(caught, '转入失败，请稍后重试'))
    } finally {
      setTransferring(false)
    }
  }

  return (
    <div>
      <PageHead title="邀请奖励" description="把邀请链接发给朋友，对方通过链接注册后，你可以获得奖励额度。" />

      <section className={styles.linkCard} aria-label="我的邀请链接">
        <span className={styles.label}>我的邀请链接</span>
        {code.isPending ? (
          <Skeleton.Input active block />
        ) : code.isError ? (
          <Alert type="error" showIcon title="邀请链接暂时获取不到" action={<Button size="small" onClick={() => void code.refetch()}>重试</Button>} />
        ) : (
          <div className={styles.linkRow}>
            <Typography.Text className={styles.link} copyable={{ text: link, tooltips: ['复制链接', '已复制'] }}>
              {link}
            </Typography.Text>
          </div>
        )}
        <span className={styles.hint}>邀请码：{code.data ?? '—'}。朋友打开链接后注册，邀请关系会自动记录。</span>
      </section>

      <dl className={styles.stats}>
        <div>
          <dt>已邀请</dt>
          <dd>{(user?.aff_count ?? 0).toLocaleString('zh-CN')} 人</dd>
        </div>
        <div>
          <dt>待转入奖励</dt>
          <dd>{formatQuota(pending, format)}</dd>
        </div>
        <div>
          <dt>累计获得</dt>
          <dd>{formatQuota(user?.aff_history_quota ?? 0, format)}</dd>
        </div>
      </dl>

      <section className={styles.transfer} aria-labelledby="transfer-title">
        <h2 id="transfer-title">转入余额</h2>
        <p className={styles.hint}>奖励转入可用余额后即可用于调用，每次最少 {formatQuota(minQuota, format)}。</p>
        <Space.Compact className={styles.transferRow}>
          <InputNumber
            min={0}
            max={pendingAmount}
            precision={2}
            value={amount}
            placeholder={pending > 0 ? `全部 ${pendingAmount}` : '暂无可转入奖励'}
            onChange={(value) => { setAmount(typeof value === 'number' ? value : null); setError(null) }}
            disabled={pending < minQuota}
            aria-label="转入金额（元）"
            style={{ width: '100%' }}
          />
          <Space.Addon>元</Space.Addon>
          <Button type="primary" loading={transferring} disabled={pending < minQuota} onClick={() => void transfer()}>
            转入余额
          </Button>
        </Space.Compact>
        {pending > 0 && pending < minQuota ? (
          <p className={styles.hint}>奖励满 ¥{minAmount} 后可以转入。</p>
        ) : null}
        {error ? <Alert type="error" showIcon title={error} /> : null}
      </section>
    </div>
  )
}
