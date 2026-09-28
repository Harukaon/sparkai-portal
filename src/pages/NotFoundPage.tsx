import { Button, Result } from 'antd'
import { Link } from 'react-router-dom'

import { usePageTitle } from '@/shared/hooks/use-page-title'
import { useT } from '@/shared/i18n'

export function NotFoundPage() {
  const t = useT()
  usePageTitle(t('页面不存在', 'Page not found'))

  return (
    <div className="container" style={{ paddingBlock: 'var(--space-24)' }}>
      <Result
        status="404"
        title={t('这个页面不存在', 'This page does not exist')}
        subTitle={t('地址可能写错了，或者页面还没做出来。', 'The address may be wrong, or the page does not exist yet.')}
        extra={
          <Link to="/">
            <Button type="primary">{t('回到首页', 'Back home')}</Button>
          </Link>
        }
      />
    </div>
  )
}
