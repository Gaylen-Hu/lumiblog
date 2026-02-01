import { CheckCircleFilled, PlusOutlined } from '@ant-design/icons';
import { Card, Col, Empty, Modal, Pagination, Row, Spin, Tabs, message } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { getMediaList } from '@/services/blog/media';
import OssUploader from '@/components/OssUploader';
import styles from './index.less';

export interface MediaPickerProps {
  /** 弹窗是否打开 */
  open: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 选择媒体后的回调 */
  onSelect: (media: BlogAPI.Media) => void;
  /** 媒体类型筛选 */
  mediaType?: 'image' | 'video' | 'audio' | 'document';
}

const PAGE_SIZE = 12;

const MediaPicker: React.FC<MediaPickerProps> = ({
  open,
  onClose,
  onSelect,
  mediaType,
}) => {
  const [loading, setLoading] = useState(false);
  const [mediaList, setMediaList] = useState<BlogAPI.Media[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMedia, setSelectedMedia] = useState<BlogAPI.Media | null>(null);
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');

  // 获取媒体列表
  const fetchMediaList = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const response = await getMediaList({
        page,
        limit: PAGE_SIZE,
        mediaType,
      });
      setMediaList(response.data);
      setTotal(response.total);
    } catch {
      message.error('加载媒体列表失败');
    } finally {
      setLoading(false);
    }
  }, [mediaType]);

  // 弹窗打开时加载数据
  useEffect(() => {
    if (open) {
      setSelectedMedia(null);
      setCurrentPage(1);
      setActiveTab('library');
      fetchMediaList(1);
    }
  }, [open, fetchMediaList]);

  // 分页变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedMedia(null);
    fetchMediaList(page);
  };

  // 选择媒体项
  const handleMediaClick = (media: BlogAPI.Media) => {
    setSelectedMedia(media);
  };

  // 确认选择
  const handleConfirm = () => {
    if (selectedMedia) {
      onSelect(selectedMedia);
      onClose();
    }
  };

  // 上传成功回调
  const handleUploadSuccess = (media: BlogAPI.Media) => {
    // 上传成功后直接选中并返回
    onSelect(media);
    onClose();
  };

  // 渲染媒体缩略图
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
        <span className={styles.fileType}>{media.mimeType.split('/')[1]?.toUpperCase()}</span>
      </div>
    );
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 媒体库 Tab 内容
  const renderLibraryContent = () => (
    <Spin spinning={loading}>
      {mediaList.length > 0 ? (
        <>
          <Row gutter={[16, 16]}>
            {mediaList.map((media) => {
              const isSelected = selectedMedia?.id === media.id;
              return (
                <Col key={media.id} xs={12} sm={8} md={6}>
                  <Card
                    hoverable
                    className={`${styles.mediaCard} ${isSelected ? styles.selected : ''}`}
                    onClick={() => handleMediaClick(media)}
                    cover={renderThumbnail(media)}
                  >
                    <Card.Meta
                      title={media.originalName}
                      description={formatFileSize(media.size)}
                    />
                    {isSelected ? (
                      <CheckCircleFilled className={styles.checkIcon} />
                    ) : null}
                  </Card>
                </Col>
              );
            })}
          </Row>
          <div className={styles.pagination}>
            <Pagination
              current={currentPage}
              pageSize={PAGE_SIZE}
              total={total}
              onChange={handlePageChange}
              showSizeChanger={false}
              showTotal={(t) => `共 ${t} 项`}
            />
          </div>
        </>
      ) : (
        <Empty description="暂无媒体文件" />
      )}
    </Spin>
  );

  // 上传 Tab 内容
  const renderUploadContent = () => {
    // 根据 mediaType 设置 accept
    const acceptMap: Record<string, string> = {
      image: 'image/*',
      video: 'video/*',
      audio: 'audio/*',
      document: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt',
    };
    const accept = mediaType ? acceptMap[mediaType] : undefined;

    return (
      <div className={styles.uploadArea}>
        <OssUploader
          dragger
          accept={accept}
          onSuccess={handleUploadSuccess}
        >
          <p className="ant-upload-drag-icon">
            <PlusOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            {mediaType === 'image' ? '支持 JPG、PNG、GIF 等图片格式' : '支持常见文件格式'}
          </p>
        </OssUploader>
      </div>
    );
  };

  const tabItems = [
    {
      key: 'library',
      label: '媒体库',
      children: renderLibraryContent(),
    },
    {
      key: 'upload',
      label: '上传新文件',
      children: renderUploadContent(),
    },
  ];

  return (
    <Modal
      title="选择媒体"
      open={open}
      onCancel={onClose}
      onOk={handleConfirm}
      okText="确认选择"
      cancelText="取消"
      okButtonProps={{ disabled: !selectedMedia }}
      width={800}
      destroyOnHidden
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'library' | 'upload')}
        items={tabItems}
      />
    </Modal>
  );
};

export default MediaPicker;
