import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import { Link } from 'react-router-dom'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

import { cn } from '@/shared/lib/format'

import styles from './Markdown.module.css'

/**
 * 站内链接（/console/... 这种）在当前页跳转；
 * 外链一律新窗口打开，并切断 opener，避免被跳转页面反向控制。
 */
const COMPONENTS: Components = {
  a: ({ href, children }) =>
    href && href.startsWith('/') && !href.startsWith('//') ? (
      <Link to={href}>{children}</Link>
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
}

/**
 * 渲染后台写的 Markdown（公告、通知）。后台也常直接写 HTML，所以支持 HTML，
 * 但先过一遍白名单清洗：<script>、事件属性、javascript: 链接等危险内容一律丢掉。
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn(styles.markdown, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
