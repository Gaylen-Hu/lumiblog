import {
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Tooltip,
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { getMediaList, deleteMedia } from '@/services/blog/media';
import OssUploader from '@/components/OssUploader';
import styles from './index.less';

/** 媒体类型选项 */
const MEDIA_TYPE_OPTIONS = [
  { label: '全部类型', value: '' },
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: '音频', value: 'audio' },
  { label: '文档', value: 'document' },
];

/** 每页显示数量选项 */
const PAGE_SIZE_OPTIONS = [12, 24, 48];

/** 默认每页数量 */
const DEFAULT_PAGE_SIZE = 12;

/** 格式化文件大小 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** 格式化日期 */
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const MediaList: React.FC = () => {
  const { message } = App.useApp();

  // 列表状态
  const [loading, setLoading] = useState(false);
  const [mediaList, setMediaList] = useState<BlogAPI.Media[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>('');

  // 预览弹窗状态
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<BlogAPI.Media | null>(null);

  // 上传弹窗状态
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  /** 获取媒体列表 */
  const fetchMediaList = useCallback(
    async (page: number, limit: number, mediaType?: string) => {
      setLoading(true);
      try {
        const params: { page: number; limit: number; mediaType?: string } = {
          page,
          limit,
        };
        if (mediaType) {
          params.mediaType = mediaType;
        }
        const response = await getMediaList(params);
        setMediaList(response.data);
        setTotal(response.total);
      } catch {
        message.error('加载媒体列表失败');
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  // 初始加载
  useEffect(() => {
    fetchMediaList(currentPage, pageSize, mediaTypeFilter);
  }, [fetchMediaList, currentPage, pageSize, mediaTypeFilter]);

  /** 处理分页变化 */
  const handlePageChange = (page: number, size?: number) => {
    const newSize = size || pageSize;
    setCurrentPage(page);
    if (size && size !== pageSize) {
      setPageSize(newSize);
    }
  };

  /** 处理媒体类型筛选变化 */
  const handleMediaTypeChange = (value: string) => {
    setMediaTypeFilter(value);
    setCurrentPage(1);
  };

  /** 处理删除媒体 */
  const handleDelete = async (id: string) => {
    try {
      await deleteMedia(id);
      message.success('删除成功');
      // 如果当前页只有一条数据且不是第一页，则跳转到上一页
      if (mediaList.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchMediaList(currentPage, pageSize, mediaTypeFilter);
      }
    } catch {
      message.error('删除失败，请重试');
    }
  };

  /** 处理预览 */
  const handlePreview = (media: BlogAPI.Media) => {
    setPreviewMedia(media);
    setPreviewOpen(true);
  };

  /** 复制 URL 到剪贴板 */
  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      message.success('URL 已复制到剪贴板');
    } catch {
      message.error('复制失败，请手动复制');
    }
  };

  /** 上传成功回调 */
  const handleUploadSuccess = () => {
    message.success('上传成功');
    setUploadModalOpen(false);
    // 刷新列表，跳转到第一页
    setCurrentPage(1);
    fetchMediaList(1, pageSize, mediaTypeFilter);
  };

  /** 渲染媒体缩略图 */
  const renderThumbnail = (media: BlogAPI.Media) => {
    if (media.mediaType === 'image') {
      return (
        <img
          src={media.url}
          alt={media.alt || media.originalName}
          className={styles.thumbnail}
        />
      );
    }
    // 非图片类型显示文件图标
    return (
      <div className={styles.fileIcon}>
        <FileOutlined style={{ fontSize: 32, color: '#999', marginBottom: 8 }} />
        <span className={styles.fileType}>
          {media.mimeType.split('/')[1]?.toUpperCase() || media.mediaType.toUpperCase()}
        </span>
      </div>
    );
  };

  /** 渲染预览内容 */
  const renderPreviewContent = () => {
    if (!previewMedia) return null;

    return (
      <>
        {previewMedia.mediaType === 'image' ? (
          <img
            src={previewMedia.url}
            alt={previewMedia.alt || previewMedia.originalName}
            className={styles.previewImage}
          />
        ) : (
          <div className={styles.fileIcon} style={{ height: 200 }}>
            <FileOutlined style={{ fontSize: 64, color: '#999', marginBottom: 16 }} />
            <span className={styles.fileType}>
              {previewMedia.mimeType.split('/')[1]?.toUpperCase() ||
                previewMedia.mediaType.toUpperCase()}
            </span>
          </div>
        )}
        <div className={styles.previewInfo}>
          <div className={styles.previewInfoItem}>
            <span className={styles.previewInfoLabel}>文件名：</span>
            <span className={styles.previewInfoValue}>{previewMedia.originalName}</span>
          </div>
          <div className={styles.previewInfoItem}>
            <span className={styles.previewInfoLabel}>类型：</span>
            <span className={styles.previewInfoValue}>{previewMedia.mimeType}</span>
          </div>
          <div className={styles.previewInfoItem}>
            <span className={styles.previewInfoLabel}>大小：</span>
            <span className={styles.previewInfoValue}>
              {formatFileSize(previewMedia.size)}
            </span>
          </div>
          {previewMedia.width && previewMedia.height ? (
            <div className={styles.previewInfoItem}>
              <span className={styles.previewInfoLabel}>尺寸：</span>
              <span className={styles.previewInfoValue}>
                {previewMedia.width} × {previewMedia.height}
              </span>
            </div>
          ) : null}
          <div className={styles.previewInfoItem}>
            <span className={styles.previewInfoLabel}>上传时间：</span>
            <span className={styles.previewInfoValue}>
              {formatDate(previewMedia.createdAt)}
            </span>
          </div>
          <div className={styles.previewInfoItem}>
            <span className={styles.previewInfoLabel}>URL：</span>
            <div className={styles.urlCopyWrapper}>
              <Input
                value={previewMedia.url}
                readOnly
                size="small"
                style={{ flex: 1 }}
              />
              <Button
                type="primary"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopyUrl(previewMedia.url)}
              >
                复制
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <PageContainer>
      {/* 工具栏 */}
      <Card>
        <Space size="large">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setUploadModalOpen(true)}
          >
            上传文件
          </Button>
          <div className={styles.filterBar}>
            <span className={styles.filterLabel}>媒体类型：</span>
            <Select
              value={mediaTypeFilter}
              onChange={handleMediaTypeChange}
              options={MEDIA_TYPE_OPTIONS}
              style={{ width: 120 }}
            />
          </div>
        </Space>
      </Card>

      {/* 媒体网格 */}
      <Spin spinning={loading}>
        <div className={styles.mediaGrid}>
          {mediaList.length > 0 ? (
            <>
              <Row gutter={[16, 16]}>
                {mediaList.map((media) => (
                  <Col key={media.id} xs={12} sm={8} md={6} lg={4} xl={4}>
                    <Card
                      hoverable
                      className={styles.mediaCard}
                      cover={renderThumbnail(media)}
                      actions={[
                        <Tooltip title="预览" key="preview">
                          <EyeOutlined onClick={() => handlePreview(media)} />
                        </Tooltip>,
                        <Tooltip title="复制 URL" key="copy">
                          <CopyOutlined onClick={() => handleCopyUrl(media.url)} />
                        </Tooltip>,
                        <Popconfirm
                          key="delete"
                          title="确定删除此媒体文件？"
                          description="删除后无法恢复"
                          onConfirm={() => handleDelete(media.id)}
                        >
                          <Tooltip title="删除">
                            <DeleteOutlined style={{ color: '#ff4d4f' }} />
                          </Tooltip>
                        </Popconfirm>,
                      ]}
                    >
                      <Card.Meta
                        title={
                          <Tooltip title={media.originalName}>
                            {media.originalName}
                          </Tooltip>
                        }
                        description={
                          <>
                            <div>{formatFileSize(media.size)}</div>
                            <div style={{ fontSize: 11, color: '#bbb' }}>
                              {formatDate(media.createdAt)}
                            </div>
                          </>
                        }
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
              <div className={styles.pagination}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={total}
                  onChange={handlePageChange}
                  showSizeChanger
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  showTotal={(t) => `共 ${t} 项`}
                  showQuickJumper
                />
              </div>
            </>
          ) : (
            <Empty
              description="暂无媒体文件"
              style={{ marginTop: 48, marginBottom: 48 }}
            >
              <Button type="primary" onClick={() => setUploadModalOpen(true)}>
                立即上传
              </Button>
            </Empty>
          )}
        </div>
      </Spin>

      {/* 上传弹窗 */}
      <Modal
        title="上传文件"
        open={uploadModalOpen}
        onCancel={() => setUploadModalOpen(false)}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <OssUploader
          dragger
          multiple
          onSuccess={handleUploadSuccess}
        >
          <p className="ant-upload-drag-icon">
            <PlusOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持图片、视频、音频、文档等常见文件格式，单个文件最大 10MB
          </p>
        </OssUploader>
      </Modal>

      {/* 预览弹窗 */}
      <Modal
        title="媒体预览"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={800}
        className={styles.previewModal}
        destroyOnHidden
      >
        {renderPreviewContent()}
      </Modal>
    </PageContainer>
  );
};

export default MediaList;
