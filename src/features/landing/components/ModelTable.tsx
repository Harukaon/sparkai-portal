import { Tag } from 'antd'
import { Table } from 'antd'
import type { TableProps } from 'antd'

import type { ModelGroup, ModelItem } from '@/features/landing/types'
import { formatCompact } from '@/shared/lib/format'

import styles from './ModelTable.module.css'

interface ModelTableProps {
  groups: ModelGroup[]
}

/** 端点标签：告诉用户这个模型该走哪套协议 */
const ENDPOINT_LABEL: Record<ModelItem['endpoint'], string> = {
  openai: 'OpenAI 协议',
  anthropic: 'Anthropic 协议',
}

export function ModelTable({ groups }: ModelTableProps) {
  const columns: TableProps<ModelItem>['columns'] = [
    {
      title: '模型',
      dataIndex: 'name',
      key: 'name',
      render: (_value, record) => (
        <div className={styles.model}>
          <div className={styles.modelName}>
            {record.name}
            {record.tag ? (
              <Tag className={styles.modelTag} variant="filled">
                {record.tag}
              </Tag>
            ) : null}
          </div>
          <div className={styles.modelId}>{record.id}</div>
        </div>
      ),
    },
    {
      title: '上下文',
      dataIndex: 'contextWindow',
      key: 'contextWindow',
      width: 120,
      render: (value: number) => `${formatCompact(value)} token`,
    },
    {
      title: '调用协议',
      dataIndex: 'endpoint',
      key: 'endpoint',
      width: 140,
      render: (value: ModelItem['endpoint']) => ENDPOINT_LABEL[value],
    },
  ]

  return (
    <div className={styles.groups}>
      {groups.map((group) => (
        <section key={group.id} className={styles.group}>
          <h3 className={styles.groupTitle}>{group.name}</h3>
          <Table<ModelItem>
            className={styles.table}
            columns={columns}
            dataSource={group.models}
            rowKey="id"
            pagination={false}
            size="middle"
            scroll={{ x: 520 }}
          />
        </section>
      ))}
      <p className={styles.footnote}>
        以上为常用模型示例，完整清单与实时可用状态以控制台的模型列表为准。
      </p>
    </div>
  )
}
