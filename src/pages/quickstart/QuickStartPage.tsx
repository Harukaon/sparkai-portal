import { Tabs, Typography } from 'antd'
import { Link } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/auth-store'
import { useSystemStatus } from '@/features/auth/hooks'
import { usePricing } from '@/features/models/api'
import { usePageTitle } from '@/shared/hooks/use-page-title'

import styles from './QuickStartPage.module.css'

function samples(base: string, model: string) {
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
      label: 'Python（OpenAI SDK）',
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
      label: 'Node.js（OpenAI SDK）',
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
      label: 'Python（Anthropic SDK）',
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
  usePageTitle('快速开始')
  const authenticated = useAuthStore((state) => state.status === 'authenticated')
  const system = useSystemStatus()
  const pricing = usePricing()
  const base = (system.data?.server_address || window.location.origin).replace(/\/+$/, '')
  const model = pricing.data?.data[0]?.model_name ?? '模型名'

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1>快速开始</h1>
        <p>三步接入：拿到密钥，把 SDK 的地址换成本站，照常调用。</p>
      </header>

      <ol className={styles.steps}>
        <li>
          <h2>{authenticated ? '账号已就绪，确认余额' : '注册账号并充值'}</h2>
          <p>
            调用按实际用量从余额扣费。
            {authenticated ? <Link to="/console/wallet">去充值</Link> : <Link to="/register">创建账号</Link>}
          </p>
        </li>
        <li>
          <h2>创建 API 密钥</h2>
          <p>
            在控制台新建一个密钥，复制保存好（形如 <code>sk-…</code>）。
            <Link to={authenticated ? '/console/keys' : '/login?redirect=%2Fconsole%2Fkeys'}>去创建密钥</Link>
          </p>
        </li>
        <li>
          <h2>把接口地址换成本站</h2>
          <div className={styles.endpoints}>
            <div>
              <span>OpenAI 协议</span>
              <Typography.Text copyable={{ text: `${base}/v1` }} className={styles.mono}>{base}/v1</Typography.Text>
            </div>
            <div>
              <span>Anthropic 协议</span>
              <Typography.Text copyable={{ text: base }} className={styles.mono}>{base}</Typography.Text>
            </div>
          </div>
          <p>
            模型名填模型广场里的「调用名称」。<Link to="/models">查看可用模型</Link>
          </p>
        </li>
      </ol>

      <section className={styles.code} aria-label="调用示例">
        <h2>调用示例</h2>
        <Tabs
          items={samples(base, model).map((sample) => ({
            key: sample.key,
            label: sample.label,
            children: (
              <div className={styles.snippet}>
                <Typography.Text copyable={{ text: sample.code, tooltips: ['复制代码', '已复制'] }} className={styles.copy} />
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
