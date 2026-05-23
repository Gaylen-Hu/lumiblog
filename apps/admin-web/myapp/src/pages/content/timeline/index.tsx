import {
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  PictureOutlined,
  PlusOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  App,
  Button,
  Card,
  Empty,
  Image,
  Input,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Upload,
} from 'antd';
import type { RcFile, UploadFile } from 'antd/es/upload';
import React, { useCallback, useEffect, useState } from 'react';
import {
  getTimelines,
  createTimeline,
  updateTimeline,
  deleteTimeline,
} from '@/services/blog/timeline';
import { getOssSignature, recordOssUpload } from '@/services/blog/media';
import styles from './index.less';

/** 最大图片数量 */
const MAX_IMAGES = 9;
/** 最大文件大小 10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;
/** 接受的图片类型 */
const ACCEPT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const TimelinePage: React.FC = () => {
  const { message } = App.useApp();

  // 列表状态
  const [entries, setEntries] = useState<BlogAPI.Timeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // 发布表单状态
  const [content, setContent] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);

  /** 加载时间轴列表 */
  const loadEntries = useCallback(async (pageNum: number, append = false) => {
    setLoading(true);
    try {
      const res = await getTimelines({ page: pageNum, limit: 10 });
      if (append) {
        setEntries((prev) => [...prev, ...res.data]);
      } else {
        setEntries(res.data);
      }
      setTotal(res.total);
      setHasMore(res.data.length === 10 && pageNum * 10 < res.total);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    loadEntries(1);
  }, [loadEntries]);

  /** 加载更多 */
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadEntries(nextPage, true);
  };

  /** 上传图片到 OSS */
  const handleUpload = async (file: RcFile): Promise<string | null> => {
    if (!ACCEPT_TYPES.includes(file.type)) {
      message.error('仅支持 JPG、PNG、GIF、WebP 格式');
      return null;
    }
    if (file.size > MAX_FILE_SIZE) {
      message.error('图片大小不能超过 10MB');
      return null;
    }

    try {
      const signatureData = await getOssSignature({
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        category: 'image',
      });

      const formData = new FormData();
      formData.append('key', signatureData.key);
      formData.append('policy', signatureData.policy);
      formData.append('OSSAccessKeyId', signatureData.accessKeyId);
      formData.append('signature', signatureData.signature);
      if (signatureData.callback) {
        formData.append('callback', signatureData.callback);
        formData.append('x:originalName', file.name);
      }
      formData.append('file', file);

      const response = await fetch(signatureData.host, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('上传失败');
      }

      if (!signatureData.callback) {
        await recordOssUpload({
          object: signatureData.key,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          url: signatureData.url,
        });
      }

      return signatureData.url;
    } catch {
      message.error(`${file.name} 上传失败`);
      return null;
    }
  };

  /** 发布新想法 */
  const handlePublish = async () => {
    const trimmed = content.trim();
    if (!trimmed && imageUrls.length === 0) {
      message.warning('请输入想法或添加图片');
      return;
    }

    setSubmitting(true);
    try {
      const year = new Date().getFullYear().toString();
      await createTimeline({
        year,
        titleZh: trimmed || '想法',
        titleEn: trimmed || 'Thought',
        descZh: trimmed,
        descEn: trimmed,
        images: imageUrls,
        order: 0,
        isVisible: true,
      });
      message.success('发布成功');
      setContent('');
      setImageUrls([]);
      setPage(1);
      loadEntries(1);
    } catch {
      message.error('发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  /** 删除条目 */
  const handleDelete = async (id: string) => {
    try {
      await deleteTimeline(id);
      message.success('已删除');
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setTotal((prev) => prev - 1);
    } catch {
      message.error('删除失败');
    }
  };

  /** 切换可见性 */
  const handleToggleVisibility = async (entry: BlogAPI.Timeline) => {
    try {
      await updateTimeline(entry.id, { isVisible: !entry.isVisible });
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, isVisible: !e.isVisible } : e,
        ),
      );
    } catch {
      message.error('操作失败');
    }
  };

  /** 进入编辑模式 */
  const handleStartEdit = (entry: BlogAPI.Timeline) => {
    setEditingId(entry.id);
    setEditContent(entry.descZh);
    setEditImages(entry.images || []);
  };

  /** 保存编辑 */
  const handleSaveEdit = async (entry: BlogAPI.Timeline) => {
    const trimmed = editContent.trim();
    if (!trimmed && editImages.length === 0) {
      message.warning('内容不能为空');
      return;
    }

    try {
      await updateTimeline(entry.id, {
        titleZh: trimmed || '想法',
        titleEn: trimmed || 'Thought',
        descZh: trimmed,
        descEn: trimmed,
        images: editImages,
      });
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...e, descZh: trimmed, titleZh: trimmed || '想法', images: editImages }
            : e,
        ),
      );
      setEditingId(null);
      message.success('已更新');
    } catch {
      message.error('更新失败');
    }
  };

  /** 发布区域图片上传处理 */
  const handleComposeUpload = async (file: RcFile) => {
    if (imageUrls.length >= MAX_IMAGES) {
      message.warning(`最多上传 ${MAX_IMAGES} 张图片`);
      return false;
    }
    setUploading(true);
    const url = await handleUpload(file);
    if (url) {
      setImageUrls((prev) => [...prev, url]);
    }
    setUploading(false);
    return false;
  };

  /** 编辑区域图片上传处理 */
  const handleEditUpload = async (file: RcFile) => {
    if (editImages.length >= MAX_IMAGES) {
      message.warning(`最多上传 ${MAX_IMAGES} 张图片`);
      return false;
    }
    setUploading(true);
    const url = await handleUpload(file);
    if (url) {
      setEditImages((prev) => [...prev, url]);
    }
    setUploading(false);
    return false;
  };

  return (
    <PageContainer title={false} className={styles.container}>
      {/* 发布区域 */}
      <Card className={styles.composeCard} bordered={false}>
        <Input.TextArea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="记录一个想法..."
          autoSize={{ minRows: 2, maxRows: 6 }}
          maxLength={500}
          showCount
          className={styles.composeInput}
        />

        {/* 已上传图片预览 */}
        {imageUrls.length > 0 && (
          <div className={styles.imageGrid}>
            {imageUrls.map((url, idx) => (
              <div key={url} className={styles.imageItem}>
                <Image
                  src={url}
                  width="100%"
                  height="100%"
                  style={{ objectFit: 'cover', borderRadius: 8 }}
                  preview={{ mask: false }}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  className={styles.removeBtn}
                  onClick={() =>
                    setImageUrls((prev) => prev.filter((_, i) => i !== idx))
                  }
                />
              </div>
            ))}
          </div>
        )}

        {/* 底部操作栏 */}
        <div className={styles.composeActions}>
          <Upload
            accept={ACCEPT_TYPES.join(',')}
            showUploadList={false}
            multiple
            beforeUpload={handleComposeUpload}
            disabled={uploading || imageUrls.length >= MAX_IMAGES}
          >
            <Button
              type="text"
              icon={<PictureOutlined />}
              loading={uploading}
              disabled={imageUrls.length >= MAX_IMAGES}
            >
              图片{imageUrls.length > 0 ? ` ${imageUrls.length}/${MAX_IMAGES}` : ''}
            </Button>
          </Upload>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handlePublish}
            loading={submitting}
            disabled={!content.trim() && imageUrls.length === 0}
          >
            发布
          </Button>
        </div>
      </Card>

      {/* 时间轴列表 */}
      <div className={styles.feedList}>
        {entries.map((entry) => (
          <Card
            key={entry.id}
            className={styles.feedCard}
            bordered={false}
          >
            {editingId === entry.id ? (
              /* 编辑模式 */
              <div className={styles.editMode}>
                <Input.TextArea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  maxLength={500}
                  showCount
                />
                {editImages.length > 0 && (
                  <div className={styles.imageGrid}>
                    {editImages.map((url, idx) => (
                      <div key={url} className={styles.imageItem}>
                        <Image
                          src={url}
                          width="100%"
                          height="100%"
                          style={{ objectFit: 'cover', borderRadius: 8 }}
                          preview={{ mask: false }}
                        />
                        <Button
                          type="text"
                          size="small"
                          icon={<CloseOutlined />}
                          className={styles.removeBtn}
                          onClick={() =>
                            setEditImages((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className={styles.editActions}>
                  <Upload
                    accept={ACCEPT_TYPES.join(',')}
                    showUploadList={false}
                    multiple
                    beforeUpload={handleEditUpload}
                    disabled={uploading || editImages.length >= MAX_IMAGES}
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<PictureOutlined />}
                      loading={uploading}
                    >
                      添加图片
                    </Button>
                  </Upload>
                  <Space>
                    <Button size="small" onClick={() => setEditingId(null)}>
                      取消
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => handleSaveEdit(entry)}
                    >
                      保存
                    </Button>
                  </Space>
                </div>
              </div>
            ) : (
              /* 展示模式 */
              <>
                <div className={styles.cardHeader}>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardYear}>{entry.year}</span>
                    {!entry.isVisible && (
                      <Tag color="default" className={styles.hiddenTag}>
                        <EyeInvisibleOutlined /> 隐藏
                      </Tag>
                    )}
                  </div>
                  <Space size={4}>
                    <Button
                      type="text"
                      size="small"
                      icon={
                        entry.isVisible ? (
                          <EyeOutlined />
                        ) : (
                          <EyeInvisibleOutlined />
                        )
                      }
                      onClick={() => handleToggleVisibility(entry)}
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleStartEdit(entry)}
                    />
                    <Popconfirm
                      title="确定删除？"
                      onConfirm={() => handleDelete(entry.id)}
                    >
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                  </Space>
                </div>

                {entry.descZh && (
                  <p className={styles.cardContent}>{entry.descZh}</p>
                )}

                {entry.images && entry.images.length > 0 && (
                  <div className={styles.imageGrid}>
                    <Image.PreviewGroup>
                      {entry.images.map((url) => (
                        <div key={url} className={styles.imageItem}>
                          <Image
                            src={url}
                            width="100%"
                            height="100%"
                            style={{ objectFit: 'cover', borderRadius: 8 }}
                          />
                        </div>
                      ))}
                    </Image.PreviewGroup>
                  </div>
                )}

                <div className={styles.cardFooter}>
                  <span className={styles.cardTime}>
                    {new Date(entry.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
              </>
            )}
          </Card>
        ))}

        {/* 加载状态 */}
        {loading && (
          <div className={styles.loadingWrap}>
            <Spin />
          </div>
        )}

        {/* 空状态 */}
        {!loading && entries.length === 0 && (
          <Empty description="还没有想法，发布第一条吧" />
        )}

        {/* 加载更多 */}
        {!loading && hasMore && entries.length > 0 && (
          <div className={styles.loadMoreWrap}>
            <Button type="link" onClick={handleLoadMore}>
              加载更多
            </Button>
          </div>
        )}

        {/* 到底了 */}
        {!loading && !hasMore && entries.length > 0 && (
          <div className={styles.endWrap}>
            <span>— 已经到底了 —</span>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default TimelinePage;
