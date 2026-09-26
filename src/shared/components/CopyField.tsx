import { App as AntdApp, Button } from 'antd'
import { CheckOutlined, CopyOutlined } from '@ant-design/icons'
import { useEffect, useRef, useState } from 'react'

import styles from './CopyField.module.css'

interface CopyFieldProps {
  label: string
  value: string
  hint?: string
}

/** 一行「标签 + 可复制内容」，用于接入地址、密钥等需要原样拷走的信息 */
export function CopyField({ label, value, hint }: CopyFieldProps) {
  const { message } = AntdApp.useApp()
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      message.success('已复制')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // 非 https 或用户拒绝授权时会走到这里，给出可执行的替代方案
      message.error('浏览器不允许自动复制，请手动选中这一行复制')
    }
  }

  return (
    <div className={styles.field}>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        <Button
          type="text"
          size="small"
          icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          onClick={handleCopy}
        >
          {copied ? '已复制' : '复制'}
        </Button>
      </div>
      <div className={styles.value}>{value}</div>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  )
}
