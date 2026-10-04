import { AppleOutlined, ArrowRightOutlined, CheckOutlined, ClockCircleOutlined, DownloadOutlined, LoadingOutlined, WindowsOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'

import { PLATFORM_LABEL, detectPlatform, formatFileSize, useDesktopRelease } from '@/features/agent/release'
import type { DesktopPlatform } from '@/features/agent/release'
import { useT } from '@/shared/i18n'

import styles from './AgentPage.module.css'

const CAPABILITIES = [
  ['浏览器操作', 'Browser actions', '打开网页、查找信息，并与页面交互', 'Browse, find information, and interact with pages'],
  ['文档与文件', 'Documents & files', '阅读、整理和编辑常见文档与项目文件', 'Read, organize, and edit common documents and project files'],
  ['持续协作', 'Work alongside you', '理解任务上下文，分步完成实际工作', 'Understand context and work through tasks step by step'],
] as const

const PLATFORM_ICON: Record<DesktopPlatform, typeof AppleOutlined> = {
  'mac-arm64': AppleOutlined,
  'win-x64': WindowsOutlined,
  'win-arm64': WindowsOutlined,
}

export function AgentPage() {
  const t = useT()
  const query = useDesktopRelease()
  const release = query.data ?? null
  // 还在读版本信息时不能先显示「敬请期待」，否则用户会误以为没上线；读完确认没有版本才显示
  const loading = query.isPending
  const mine = release ? detectPlatform(navigator.userAgent) : null
  const main = release?.files.find((file) => file.platform === mine)
  const others = release?.files.filter((file) => file !== main) ?? []

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.glow} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><span className={styles.pulse} />{release ? t(`公测版 · ${release.version.replace('0.1.0-', '')}`, `Beta · ${release.version.replace('0.1.0-', '')}`) : loading ? t('公测中', 'Public beta') : t('即将发布', 'Coming soon')}</span>
          <h1>{t('让 AI 不止于回答', 'AI that goes beyond answers')}</h1>
          <p>{release || loading ? t('自研 Agent，帮你浏览网页、处理文档，把想法一步步变成结果。现已开放公测，下载即可使用。', 'A self-developed agent to browse the web, work with documents, and turn ideas into results. Now in public beta — download to try it.') : t('自研 Agent，帮你浏览网页、处理文档，把想法一步步变成结果。即将上线，敬请期待。', 'A self-developed agent to browse the web, work with documents, and turn ideas into results. Coming soon.')}</p>
          {release ? (
            <div className={styles.downloads}>
              <div className={styles.actions}>
                {main ? (
                  <a className={styles.download} href={main.url} download>
                    <DownloadOutlined />{t('下载', 'Download for')} {t(...PLATFORM_LABEL[main.platform])}
                    <small>{formatFileSize(main.size)}</small>
                  </a>
                ) : null}
                <Link to="/quickstart" className={styles.textLink}>{t('先了解模型接入', 'Explore model access')} <ArrowRightOutlined /></Link>
              </div>
              <ul className={styles.otherList} aria-label={t('其他平台', 'Other platforms')}>
                {others.map((file) => {
                  const Icon = PLATFORM_ICON[file.platform]
                  return (
                    <li key={file.platform}>
                      <a href={file.url} download><Icon />{t(...PLATFORM_LABEL[file.platform])}<small>{formatFileSize(file.size)}</small></a>
                    </li>
                  )
                })}
              </ul>
              <p className={styles.installNote}>{t('公测版暂未做系统签名：macOS 首次打开若提示“无法验证开发者”，请在访达中右键点击应用选择“打开”；Windows 若出现 SmartScreen 提示，点“更多信息”再选“仍要运行”。', 'Beta builds are not code-signed yet. On macOS, right-click the app and choose “Open” the first time; on Windows, click “More info” then “Run anyway” if SmartScreen appears.')}</p>
            </div>
          ) : (
            <div className={styles.actions}>
              {loading ? (
                <span className={styles.coming}><LoadingOutlined />{t('正在获取下载…', 'Loading downloads…')}</span>
              ) : (
                <span className={styles.coming}><ClockCircleOutlined />{t('敬请期待', 'Coming soon')}</span>
              )}
              <Link to="/quickstart" className={styles.textLink}>{t('先了解模型接入', 'Explore model access')} <ArrowRightOutlined /></Link>
            </div>
          )}
        </div>
        <div className={styles.preview} aria-label={t('Agent 界面预览', 'Agent interface preview')}>
          <div className={styles.windowBar}><i /><i /><i /><span>AGENT WORKSPACE</span><b /></div>
          <div className={styles.previewBody}>
            <div className={styles.sideRail}><span className={styles.activeRail} /><span /><span /><span /></div>
            <div className={styles.canvas}>
              <span className={styles.canvasLabel}>{t('工作空间', 'WORKSPACE')}</span>
              <div className={styles.promptCard}><span className={styles.promptDot} /><span>{t('帮我整理这份资料…', 'Help me organize these notes…')}</span></div>
              <div className={styles.taskLine}><span className={styles.taskCheck}><CheckOutlined /></span><span>{t('正在理解任务', 'Understanding the task')}</span><i /></div>
              <div className={styles.taskLine}><span className={styles.taskCheck}><CheckOutlined /></span><span>{t('准备浏览器与文档工具', 'Preparing browser and document tools')}</span><i /></div>
              <div className={`${styles.taskLine} ${styles.dim}`}><span className={styles.taskEmpty} /><span>{t('整理结果并交给你', 'Preparing your results')}</span></div>
              <div className={styles.composer}><span>{t('告诉 Agent 你想做什么…', 'Tell the agent what you need…')}</span><b><ArrowRightOutlined /></b></div>
            </div>
          </div>
          <div className={styles.previewFoot}><span />{release || loading ? t('产品界面预览', 'Interface preview') : t('产品界面预览 · 正在准备中', 'A preview · in the works')}</div>
        </div>
      </section>

      <section className={styles.capabilities}>
        <div className={styles.sectionHead}><span>{release || loading ? t('能做什么', 'WHAT IT DOES') : t('即将解锁', 'WHAT’S COMING')}</span><h2>{t('把更多事情，交给 Agent', 'A capable agent, ready to help')}</h2></div>
        <div className={styles.cards}>
          {CAPABILITIES.map(([zhTitle, enTitle, zhBody, enBody], index) => (
            <article className={styles.card} key={zhTitle}>
              <span className={styles.cardIndex}>0{index + 1}</span>
              <h3>{t(zhTitle, enTitle)}</h3>
              <p>{t(zhBody, enBody)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
