import { Tabs, Typography } from 'antd'
import { Link } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/auth-store'
import { useSystemStatus } from '@/features/auth/hooks'
import { usePricing } from '@/features/models/api'
import { usePageTitle } from '@/shared/hooks/use-page-title'
import { useT } from '@/shared/i18n'

import styles from './QuickStartPage.module.css'

function samples(base: string, model: string, t: (zh: string, en: string) => string) {
  return [
    {
      key: 'curl',
      label: 'curl',
      code: `curl ${base}/v1/chat/completions \\
  -H "Authorization: Bearer sk-你的密钥" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "messages": [{"role": "user", "content": "你好"}]
  }'`,
    },
    {
      key: 'python',
      label: t('Python（OpenAI SDK）', 'Python (OpenAI SDK)'),
      code: `from openai import OpenAI

client = OpenAI(
    base_url="${base}/v1",
    api_key="sk-你的密钥",
)

reply = client.chat.completions.create(
    model="${model}",
    messages=[{"role": "user", "content": "你好"}],
)
print(reply.choices[0].message.content)`,
    },
    {
      key: 'node',
      label: t('Node.js（OpenAI SDK）', 'Node.js (OpenAI SDK)'),
      code: `import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: '${base}/v1',
  apiKey: 'sk-你的密钥',
})

const reply = await client.chat.completions.create({
  model: '${model}',
  messages: [{ role: 'user', content: '你好' }],
})
console.log(reply.choices[0].message.content)`,
    },
    {
      key: 'anthropic',
      label: t('Python（Anthropic SDK）', 'Python (Anthropic SDK)'),
      code: `from anthropic import Anthropic

client = Anthropic(
    base_url="${base}",
    api_key="sk-你的密钥",
)

reply = client.messages.create(
    model="${model}",
    max_tokens=1024,
    messages=[{"role": "user", "content": "你好"}],
)
print(reply.content[0].text)`,
    },
  ]
}

export function QuickStartPage() {
  const t = useT()
  usePageTitle(t('快速开始', 'Quick Start'))
  const authenticated = useAuthStore((state) => state.status === 'authenticated')
  const system = useSystemStatus()
  const pricing = usePricing()
  // 后台「服务器地址」没配或还是本地地址时，退回当前访问域名，避免示例里出现 localhost
  const configured = system.data?.server_address ?? ''
  const configuredUsable =
    configured.startsWith('https://') ||
    (configured.startsWith('http://') && !/\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/.test(configured))
  const base = (configuredUsable ? configured : window.location.origin).replace(/\/+$/, '')
  const model = pricing.data?.data[0]?.model_name ?? t('模型名', 'model-name')

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1>{t('快速开始', 'Quick Start')}</h1>
        <p>{t('三步接入：拿到密钥，把 SDK 的地址换成本站，照常调用。', 'Three steps: get a key, point your SDK at us, and call as usual.')}</p>
      </header>

      <ol className={styles.steps}>
        <li>
          <h2>{authenticated ? t('账号已就绪，确认余额', 'Account ready — check balance') : t('注册账号并充值', 'Create an account and top up')}</h2>
          <p>
            {t('调用按实际用量从余额扣费。', 'Usage is deducted from your balance.')}
            {authenticated ? <Link to="/console/wallet">{t('去充值', 'Top up')}</Link> : <Link to="/register">{t('创建账号', 'Create account')}</Link>}
          </p>
        </li>
        <li>
          <h2>{t('创建 API 密钥', 'Create an API key')}</h2>
          <p>
            {t('在控制台新建一个密钥，复制保存好（形如', 'Create a key in the console and keep it safe (it looks like')}{' '}<code>sk-…</code>{t('）。', ')')}
            <Link to={authenticated ? '/console/keys' : '/login?redirect=%2Fconsole%2Fkeys'}>{t('去创建密钥', 'Create a key')}</Link>
          </p>
        </li>
        <li>
          <h2>{t('把接口地址换成本站', 'Point the API URL at us')}</h2>
          <div className={styles.endpoints}>
            <div>
              <span>{t('OpenAI 协议', 'OpenAI protocol')}</span>
              <Typography.Text copyable={{ text: `${base}/v1` }} className={styles.mono}>{base}/v1</Typography.Text>
            </div>
            <div>
              <span>{t('Anthropic 协议', 'Anthropic protocol')}</span>
              <Typography.Text copyable={{ text: base }} className={styles.mono}>{base}</Typography.Text>
            </div>
          </div>
          <p>
            {t('模型名填模型广场里的「调用名称」。', 'Use the model ID shown in the model list.')}{' '}<Link to="/models">{t('查看可用模型', 'See available models')}</Link>
          </p>
        </li>
      </ol>

      <section className={styles.code} aria-label={t('调用示例', 'Code samples')}>
        <h2>{t('调用示例', 'Code samples')}</h2>
        <Tabs
          items={samples(base, model, t).map((sample) => ({
            key: sample.key,
            label: sample.label,
            children: (
              <div className={styles.snippet}>
                <Typography.Text copyable={{ text: sample.code, tooltips: [t('复制代码', 'Copy code'), t('已复制', 'Copied')] }} className={styles.copy} />
                <pre>
                  <code>{sample.code}</code>
                </pre>
              </div>
            ),
          }))}
        />
      </section>
    </div>
  )
}
