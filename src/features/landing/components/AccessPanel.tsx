import { App as AntdApp, Button } from 'antd'

import { ENDPOINTS } from '@/features/landing/data'
import { CopyField } from '@/shared/components/CopyField'

import styles from './AccessPanel.module.css'

/**
 * 收尾区块：左边给行动入口，右边给可以直接拷走的接入信息。
 * 深色块只在这里用一次，作为全页唯一的强对比，把注意力收在「开始用」这件事上。
 */
export function AccessPanel() {
  const { message } = AntdApp.useApp()

  function handlePrimary() {
    message.info('注册与密钥功能还没接，下一步再和你确认')
  }

  function handleDocs() {
    message.info('接口文档页面还没做，先看下面的接入地址')
  }

  return (
    <section id="access" className={`container ${styles.section}`}>
      <div className={styles.panel}>
        <div className={styles.intro}>
          <h2 className={styles.title}>把地址填上，就能跑</h2>
          <p className={styles.lead}>
            密钥生成、额度管理、用量看板都在控制台里。注册入口还没接好，
            但接入地址与协议现在是定死的，照着下面配置就能通。
          </p>
          <div className={styles.actions}>
            <Button type="primary" size="large" onClick={handlePrimary}>
              创建密钥
            </Button>
            <Button size="large" className={styles.ghost} onClick={handleDocs}>
              看接口文档
            </Button>
          </div>
        </div>

        <div className={styles.endpoints}>
          {ENDPOINTS.map((endpoint) => (
            <CopyField
              key={endpoint.label}
              label={endpoint.label}
              value={endpoint.value}
              hint={endpoint.hint}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
