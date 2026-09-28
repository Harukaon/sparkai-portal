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
import { useT } from '@/shared/i18n'

import styles from './InvitePage.module.css'

export function InvitePage() {
  const t = useT()
  usePageTitle(t('邀请奖励', 'Referrals'))
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
      setError(t(`每次最少转入 ${formatQuota(minQuota, format)}`, `Minimum per transfer: ${formatQuota(minQuota, format)}`))
      return
    }
    setTransferring(true)
    setError(null)
    try {
      await transferInviteReward(quota)
      message.success(t(`已转入余额 ${formatQuota(quota, format)}`, `Moved ${formatQuota(quota, format)} to balance`))
      setAmount(null)
      await queryClient.invalidateQueries({ queryKey: ['current-user', userId] })
    } catch (caught: unknown) {
      setError(errorMessage(caught, t('转入失败，请稍后重试', 'Transfer failed — try again later')))
    } finally {
      setTransferring(false)
    }
  }

  return (
    <div>
      <PageHead title={t('邀请奖励', 'Referrals')} description={t('把邀请链接发给朋友，对方通过链接注册后，你可以获得奖励额度。', 'Share your invite link; earn credit when friends sign up through it.')} />

      <section className={styles.linkCard} aria-label={t('我的邀请链接', 'My invite link')}>
        <span className={styles.label}>{t('我的邀请链接', 'My invite link')}</span>
        {code.isPending ? (
          <Skeleton.Input active block />
        ) : code.isError ? (
          <Alert type="error" showIcon title={t('邀请链接暂时获取不到', 'Could not load the invite link')} action={<Button size="small" onClick={() => void code.refetch()}>{t('重试', 'Retry')}</Button>} />
        ) : (
          <div className={styles.linkRow}>
            <Typography.Text className={styles.link} copyable={{ text: link, tooltips: [t('复制链接', 'Copy link'), t('已复制', 'Copied')] }}>
              {link}
            </Typography.Text>
          </div>
        )}
        <span className={styles.hint}>{t('邀请码：', 'Invite code:')}{' '}{code.data ?? '—'}. {t('朋友打开链接后注册，邀请关系会自动记录。', 'The referral is recorded automatically when friends sign up via the link.')}</span>
      </section>

      <dl className={styles.stats}>
        <div>
          <dt>{t('已邀请', 'Invited')}</dt>
          <dd>{(user?.aff_count ?? 0).toLocaleString()}</dd>
        </div>
        <div>
          <dt>{t('待转入奖励', 'Pending reward')}</dt>
          <dd>{formatQuota(pending, format)}</dd>
        </div>
        <div>
          <dt>{t('累计获得', 'Total earned')}</dt>
          <dd>{formatQuota(user?.aff_history_quota ?? 0, format)}</dd>
        </div>
      </dl>

      <section className={styles.transfer} aria-labelledby="transfer-title">
        <h2 id="transfer-title">{t('转入余额', 'Move to balance')}</h2>
        <p className={styles.hint}>{t('奖励转入可用余额后即可用于调用，每次最少', 'Once moved to balance, rewards can be used for calls. Minimum per transfer')}{' '}{formatQuota(minQuota, format)}.</p>
        <Space.Compact className={styles.transferRow}>
          <InputNumber
            min={0}
            max={pendingAmount}
            precision={2}
            value={amount}
            placeholder={pending > 0 ? t(`全部 ${pendingAmount}`, `All ${pendingAmount}`) : t('暂无可转入奖励', 'Nothing to move yet')}
            onChange={(value) => { setAmount(typeof value === 'number' ? value : null); setError(null) }}
            disabled={pending < minQuota}
            aria-label={t('转入金额（元）', 'Amount to move (CNY)')}
            style={{ width: '100%' }}
          />
          <Space.Addon>{t('元', 'CNY')}</Space.Addon>
          <Button type="primary" loading={transferring} disabled={pending < minQuota} onClick={() => void transfer()}>
            {t('转入余额', 'Move to balance')}
          </Button>
        </Space.Compact>
        {pending > 0 && pending < minQuota ? (
          <p className={styles.hint}>{t('奖励满', 'Rewards can be moved once they reach')} ¥{minAmount}.</p>
        ) : null}
        {error ? <Alert type="error" showIcon title={error} /> : null}
      </section>
    </div>
  )
}
