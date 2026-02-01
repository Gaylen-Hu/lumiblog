import { InboxOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, message, Upload } from 'antd';
import type { RcFile, UploadFile, UploadProps } from 'antd/es/upload';
import React, { useState } from 'react';
import { getOssSignature } from '@/services/blog/media';

// 默认最大文件大小：10MB
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

// 根据 MIME 类型获取媒体分类
const getMediaCategory = (
  mimeType: string,
): 'image' | 'video' | 'audio' | 'document' | undefined => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('text/')
  ) {
    return 'document';
  }
  return undefined;
};

export interface OssUploaderProps {
  /** 接受的文件类型，如 "image/*,.pdf" */
  accept?: string;
  /** 最大文件大小（字节），默认 10MB */
  maxSize?: number;
  /** 是否支持多文件上传 */
  multiple?: boolean;
  /** 上传成功回调 */
  onSuccess?: (file: BlogAPI.Media) => void;
  /** 上传失败回调 */
  onError?: (error: Error) => void;
  /** 是否使用拖拽上传样式 */
  dragger?: boolean;
  /** 自定义上传按钮文字 */
  buttonText?: string;
  /** 子元素（自定义触发器） */
  children?: React.ReactNode;
  /** 是否显示文件列表 */
  showUploadList?: boolean;
  /** 上传目录 */
  directory?: string;
}

const OssUploader: React.FC<OssUploaderProps> = ({
  accept,
  maxSize = DEFAULT_MAX_SIZE,
  multiple = false,
  onSuccess,
  onError,
  dragger = false,
  buttonText = '上传文件',
  children,
  showUploadList = true,
  directory,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 文件上传前校验
  const beforeUpload = (file: RcFile): boolean | Promise<boolean> => {
    // 校验文件大小
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / 1024 / 1024);
      message.error(`文件大小超过限制（最大 ${maxSizeMB}MB）`);
      onError?.(new Error(`文件大小超过限制（最大 ${maxSizeMB}MB）`));
      return false;
    }

    // 校验文件类型（如果指定了 accept）
    if (accept) {
      const acceptTypes = accept.split(',').map((t) => t.trim());
      const isAccepted = acceptTypes.some((type) => {
        if (type.startsWith('.')) {
          // 扩展名匹配
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        if (type.endsWith('/*')) {
          // MIME 类型通配符匹配
          const prefix = type.slice(0, -2);
          return file.type.startsWith(prefix);
        }
        // 精确 MIME 类型匹配
        return file.type === type;
      });

      if (!isAccepted) {
        message.error('不支持的文件类型');
        onError?.(new Error('不支持的文件类型'));
        return false;
      }
    }

    return true;
  };

  // 自定义上传逻辑
  const customUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onProgress, onSuccess: uploadSuccess, onError: uploadError } = options;
    const rcFile = file as RcFile;

    try {
      // 1. 获取 OSS 签名
      const signatureData = await getOssSignature({
        filename: rcFile.name,
        mimeType: rcFile.type,
        size: rcFile.size,
        category: getMediaCategory(rcFile.type),
        directory,
      });

      // 2. 构建 FormData 直传 OSS
      const formData = new FormData();
      formData.append('key', signatureData.key);
      formData.append('policy', signatureData.policy);
      formData.append('OSSAccessKeyId', signatureData.accessKeyId);
      formData.append('signature', signatureData.signature);
      if (signatureData.callback) {
        formData.append('callback', signatureData.callback);
      }
      formData.append('file', rcFile);

      // 3. 上传到 OSS
      const xhr = new XMLHttpRequest();
      xhr.open('POST', signatureData.host, true);

      // 监听上传进度
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress?.({ percent });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // 上传成功，构建媒体信息
          const mediaInfo: BlogAPI.Media = {
            id: '', // 由后端回调生成
            filename: signatureData.key.split('/').pop() || rcFile.name,
            originalName: rcFile.name,
            mimeType: rcFile.type,
            size: rcFile.size,
            url: signatureData.url,
            storageType: 'oss',
            mediaType: getMediaCategory(rcFile.type) || 'other',
            width: null,
            height: null,
            alt: null,
            createdAt: new Date().toISOString(),
          };

          uploadSuccess?.(mediaInfo);
          onSuccess?.(mediaInfo);
          message.success(`${rcFile.name} 上传成功`);
        } else {
          const error = new Error(`上传失败：${xhr.statusText || '未知错误'}`);
          uploadError?.(error);
          onError?.(error);
          message.error(`上传失败：${xhr.statusText || '未知错误'}`);
        }
      };

      xhr.onerror = () => {
        const error = new Error('上传失败：网络错误');
        uploadError?.(error);
        onError?.(error);
        message.error('上传失败：网络错误');
      };

      xhr.send(formData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('获取上传凭证失败，请重试');
      uploadError?.(error);
      onError?.(error);
      message.error('获取上传凭证失败，请重试');
    }
  };

  // 文件列表变化处理
  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const uploadProps: UploadProps = {
    accept,
    multiple,
    fileList,
    beforeUpload,
    customRequest: customUpload,
    onChange: handleChange,
    showUploadList,
  };

  // 拖拽上传模式
  if (dragger) {
    return (
      <Upload.Dragger {...uploadProps}>
        {children ? (
          children
        ) : (
          <>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              {accept ? `支持的文件类型：${accept}` : '支持单个或批量上传'}
            </p>
          </>
        )}
      </Upload.Dragger>
    );
  }

  // 普通上传模式
  return (
    <Upload {...uploadProps}>
      {children ? (
        children
      ) : (
        <Button icon={<UploadOutlined />}>{buttonText}</Button>
      )}
    </Upload>
  );
};

export default OssUploader;
