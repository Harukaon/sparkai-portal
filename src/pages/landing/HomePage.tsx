import { AccessPanel } from '@/features/landing/components/AccessPanel'
import { AccessSteps } from '@/features/landing/components/AccessSteps'
import { CapabilityGrid } from '@/features/landing/components/CapabilityGrid'
import { Hero } from '@/features/landing/components/Hero'
import { ModelTable } from '@/features/landing/components/ModelTable'
import { PricingPreview } from '@/features/landing/components/PricingPreview'
import { MODEL_GROUPS } from '@/features/landing/data'
import { usePageTitle } from '@/shared/hooks/use-page-title'
import { Section } from '@/shared/components/Section'

/**
 * 前台落地页。
 *
 * 数据暂时来自 `features/landing/data.ts` 的示例常量；
 * 后端接口就绪后，把该文件换成接口查询即可，本页结构与样式不用改。
 */
export function HomePage() {
  usePageTitle()

  return (
    <>
      <Hero />

      <Section
        id="capability"
        title="为什么用中转站"
        description="不用为了几个模型注册几套账号、记几套密钥、对几份账单。"
      >
        <CapabilityGrid />
      </Section>

      <Section
        id="models"
        title="支持模型"
        description="一个密钥调用全部模型，按协议自动路由，不用记哪个模型走哪个端点。"
      >
        <ModelTable groups={MODEL_GROUPS} />
      </Section>

      <Section id="pricing" title="价格" description="按实际用量扣费，单价与上游一致，不额外加价。">
        <PricingPreview />
      </Section>

      <Section id="steps" title="接入步骤" description="三步，十分钟。">
        <AccessSteps />
      </Section>

      <AccessPanel />
    </>
  )
}
