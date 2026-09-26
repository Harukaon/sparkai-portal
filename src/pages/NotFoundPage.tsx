import { Button, Result } from 'antd'
import { Link } from 'react-router-dom'

import { usePageTitle } from '@/shared/hooks/use-page-title'

export function NotFoundPage() {
  usePageTitle('页面不存在')

  return (
    <div className="container" style={{ paddingBlock: 'var(--space-24)' }}>
      <Result
        status="404"
        title="这个页面不存在"
        subTitle="地址可能写错了，或者页面还没做出来。"
        extra={
          <Link to="/">
            <Button type="primary">回到首页</Button>
          </Link>
        }
      />
    </div>
  )
}
