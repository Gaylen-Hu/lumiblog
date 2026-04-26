import {
  WechatOutlined,
  PlusOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import {
  Modal,
  Form,
  Input,
  Switch,
  Button,
  Space,
  Upload,
  Image,
  Spin,
  Tag,
  App,
} from 'antd';
import React, { useState } from 'react';
import { publishToWechat } from '@/services/blog/article';
import { uploadWechatImage, uploadWechatImageFromUrl } from '@/services/blog/wechat';
import MediaPicker from '@/components/MediaPicker';

interface WechatPublishModalProps {
  open: boolean;
  articleId: string;
  coverImage?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const WechatPublishModal: React.FC<WechatPublishModalProps> = ({
  open,
  articleId,
  coverImage,
  onClose,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [thumbMediaId, setThumbMediaId] = useState<string>();
  const [thumbPreviewUrl, setThumbPreviewUrl] = useState<string>();
  const [thumbUploading, setThumbUploading] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // 打开时自动上传封面图
  React.useEffect(() => {
    if (!open) {
      setThumbMediaId(undefined);
      setThumbPreviewUrl(undefined);
      form.resetFields();
      return;
    }
    if (coverImage) {
      setThumbPreviewUrl(coverImage);
      setThumbUploading(true);
      uploadWechatImageFromUrl(coverImage)
        .then((result) => {
          setThumbMediaId(result.media_id);
          message.success('封面图已自动上传到微信素材库');
        })
        .catch(() => {
          message.warning('封面图自动上传失败，请手动选择');
          setThumbPreviewUrl(undefined);
        })
        .finally(() => setThumbUploading(false));
    }
  }, [open, coverImage, form, message]);

  const handleSubmit = async (values: BlogAPI.PublishToWechatParams) => {
    setLoading(true);
    try {
      const result = await publishToWechat(articleId, {
        ...values,
        thumbMediaId: thumbMediaId || values.thumbMediaId,
      });
      if (result.status === 'draft') {
        message.success(`已保存到微信草稿箱`);
      } else if (result.status === 'publishing') {
        message.success('正在发布到微信公众号...');
      }
      onSuccess();
      onClose();
    } catch {
      message.error('发布失败，请检查微信配置');
    } finally {
      setLoading(false);
    }
  };

  const handleThumbUpload = async (file: File) => {
    setThumbUploading(true);
    setThumbPreviewUrl(URL.createObjectURL(file));
    try {
      const result = await uploadWechatImage(file);
      setThumbMediaId(result.media_id);
      message.success('封面图上传成功');
    } catch {
      message.error('封面图上传失败');
      setThumbPreviewUrl(undefined);
    } finally {
      setThumbUploading(false);
    }
  };

  const handleMediaSelect = async (media: BlogAPI.Media) => {
    setThumbPreviewUrl(media.url);
    setThumbUploading(true);
    try {
      const result = await uploadWechatImageFromUrl(media.url);
      setThumbMediaId(result.media_id);
      message.success('封面图上传成功');
    } catch {
      message.error('封面图上传失败');
      setThumbPreviewUrl(undefined);
    } finally {
      setThumbUploading(false);
    }
  };

  return (
    <>
      <Modal
        title={<><WechatOutlined style={{ color: '#07c160' }} /> 发布到微信公众号</>}
        open={open}
        onCancel={onClose}
        footer={null}
        width={520}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            needOpenComment: true,
            onlyFansCanComment: false,
            publishImmediately: false,
          }}
        >
          <Form.Item name="author" label="作者">
            <Input placeholder="请输入作者名（可选）" />
          </Form.Item>
          <Form.Item label="封面图" required>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {thumbPreviewUrl ? (
                <div style={{ position: 'relative' }}>
                  <Image
                    src={thumbPreviewUrl}
                    width={120}
                    height={120}
                    style={{ objectFit: 'cover', borderRadius: 8 }}
                    preview={false}
                  />
                  {thumbUploading ? (
                    <div style={{
                      position: 'absolute', inset: 0, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(0,0,0,0.5)', borderRadius: 8,
                    }}>
                      <Spin size="small" />
                    </div>
                  ) : null}
                  {thumbMediaId ? (
                    <Tag color="green" style={{ position: 'absolute', bottom: 4, left: 4, margin: 0 }}>
                      已上传
                    </Tag>
                  ) : null}
                </div>
              ) : null}
              <Space direction="vertical" size="small">
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    handleThumbUpload(file as File);
                    return false;
                  }}
                >
                  <Button icon={<PlusOutlined />} loading={thumbUploading}>
                    本地上传
                  </Button>
                </Upload>
                <Button
                  icon={<PictureOutlined />}
                  onClick={() => setMediaPickerOpen(true)}
                  disabled={thumbUploading}
                >
                  从媒体库选择
                </Button>
              </Space>
            </div>
            {!thumbMediaId && !thumbUploading ? (
              <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>
                请上传或选择封面图
              </div>
            ) : null}
          </Form.Item>
          <Form.Item name="needOpenComment" label="开启评论" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="onlyFansCanComment" label="仅粉丝可评论" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="publishImmediately" label="立即发布" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={onClose}>取消</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                disabled={!thumbMediaId || thumbUploading}
                style={{ backgroundColor: '#07c160', borderColor: '#07c160' }}
              >
                确认发布
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
        mediaType="image"
      />
    </>
  );
};

export default WechatPublishModal;
