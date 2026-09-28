import { PlusOutlined } from '@ant-design/icons'
import { App as AntdApp, Upload } from 'antd'
import type { UploadFile, UploadProps } from 'antd'

import { uploadTicketImage } from '@/features/tickets/api'
import { IMAGE_TYPES, MAX_IMAGES, imageProblem } from '@/features/tickets/labels'
import { errorMessage } from '@/shared/api/client'
import { useT } from '@/shared/i18n'

interface ImagePickerProps {
  value: UploadFile[]
  onChange: (files: UploadFile[]) => void
}

/**
 * 截图上传：选完立刻传，每张 ≤1MB、最多 6 张，只收 PNG/JPG/GIF/WebP。
 * 提交表单时只带上传成功的图片编号。
 */
export function ImagePicker({ value, onChange }: ImagePickerProps) {
  const t = useT()
  const { message } = AntdApp.useApp()

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    const problem = imageProblem(file)
    if (problem === 'type') {
      message.error(t('只支持 PNG、JPG、GIF、WebP 图片', 'Only PNG, JPG, GIF and WebP images are supported'))
      return Upload.LIST_IGNORE
    }
    if (problem === 'size') {
      message.error(t(`「${file.name}」超过 1MB，请压缩或截小一点再传`, `"${file.name}" is over 1MB — please compress or crop it`))
      return Upload.LIST_IGNORE
    }
    return true
  }

  const customRequest: UploadProps['customRequest'] = ({ file, onSuccess, onError }) => {
    uploadTicketImage(file as File)
      .then((result) => onSuccess?.(result))
      .catch((error: unknown) => {
        message.error(errorMessage(error, t('图片上传失败', 'Image upload failed')))
        onError?.(error instanceof Error ? error : new Error('upload failed'))
      })
  }

  return (
    <Upload
      listType="picture-card"
      accept={IMAGE_TYPES.join(',')}
      multiple
      maxCount={MAX_IMAGES}
      fileList={value}
      beforeUpload={beforeUpload}
      customRequest={customRequest}
      onChange={({ fileList }) => onChange(fileList.filter((file) => file.status !== 'error'))}
      showUploadList={{ showPreviewIcon: false }}
    >
      {value.length >= MAX_IMAGES ? null : (
        <button type="button" style={{ border: 0, background: 'none', cursor: 'pointer' }} aria-label={t('添加截图', 'Add screenshot')}>
          <PlusOutlined />
          <div style={{ marginTop: 6, fontSize: 12 }}>{t('截图', 'Image')}</div>
        </button>
      )}
    </Upload>
  )
}
