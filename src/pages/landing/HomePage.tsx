import { Hero } from '@/features/landing/components/Hero'
import { usePageTitle } from '@/shared/hooks/use-page-title'

/**
 * 首页：只有一屏，不产生滚动。
 *
 * 产品介绍、模型清单、价格、接入步骤等内容不放在首页 ——
 * 访客来这里只想确认两件事：地址是什么、怎么拿到密钥。
 */
export function HomePage() {
  usePageTitle()

  return <Hero />
}
