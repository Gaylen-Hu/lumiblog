import {
  WechatOutlined,
  SendOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  App,
  Card,
  Tabs,
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  Modal,
  Empty,
  Spin,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import {
  getWechatDrafts,
  getWechatPublishedList,
  deleteWechatDraft,
  publishWechatDraft,
  deleteWechatPublished,
} from '@/services/blog/wechat';

const { Paragraph } = Typography;

const WechatArticles: React.FC = () => {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState('drafts');

  // 草稿状态
  const [drafts, setDrafts] = useState<WechatAPI.DraftListItem[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsTotal, setDraftsTotal] = useState(0);
  const [draftsPage, setDraftsPage] = useState(1);

  // 已发布状态
  const [published, setPublished] = useState<WechatAPI.PublishedListItem[]>([]);
  const [publishedLoading, setPublishedLoading] = useState(false);
  const [publishedTotal, setPublishedTotal] = useState(0);
  const [publishedPage, setPublishedPage] = useState(1);

  // 预览弹窗
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const pageSize = 10;

  // 加载草稿列表
  const loadDrafts = useCallback(async (page: number) => {
    setDraftsLoading(true);
    try {
      const res = await getWechatDrafts({
        offset: (page - 1) * pageSize,
        count: pageSize,
        noContent: 0,
      });
      setDrafts(res.item || []);
      setDraftsTotal(res.total_count);
    } catch {
      message.error('获取草稿列表失败');
    } finally {
      setDraftsLoading(false);
    }
  }, [message]);

  // 加载已发布列表
  const loadPublished = useCallback(async (page: number) => {
    setPublishedLoading(true);
    try {
      const res = await getWechatPublishedList({
        offset: (page - 1) * pageSize,
        count: pageSize,
        noContent: 0,
      });
      setPublished(res.item || []);
      setPublishedTotal(res.total_count);
    } catch {
      message.error('获取已发布列表失败');
    } finally {
      setPublishedLoading(false);
    }
  }, [message]);

  useEffect(() => {
    if (activeTab === 'drafts') {
      loadDrafts(draftsPage);
    } else {
      loadPublished(publishedPage);
    }
  }, [activeTab, draftsPage, publishedPage, loadDrafts, loadPublished]);

  // 发布草稿
  const handlePublish = async (mediaId: string) => {
    try {
      await publishWechatDraft(mediaId);
      message.success('已提交发布，请稍后刷新查看状态');
      loadDrafts(draftsPage);
    } catch {
      message.error('发布失败');
    }
  };

  // 删除草稿
  const handleDeleteDraft = async (mediaId: string) => {
    try {
      await deleteWechatDraft(mediaId);
      message.success('删除成功');
      loadDrafts(draftsPage);
    } catch {
      message.error('删除失败');
    }
  };

  // 删除已发布
  const handleDeletePublished = async (articleId: string) => {
    try {
      await deleteWechatPublished(articleId);
      message.success('删除成功');
      loadPublished(publishedPage);
    } catch {
      message.error('删除失败');
    }
  };

  // 预览内容
  const handlePreview = (title: string, content: string) => {
    setPreviewTitle(title);
    setPreviewContent(content);
    setPreviewOpen(true);
  };

  // 草稿表格列
  const draftColumns: ColumnsType<WechatAPI.DraftListItem> = [
    {
      title: '标题',
      dataIndex: ['content', 'news_item'],
      width: 300,
      render: (newsItems: WechatAPI.DraftNewsItem[]) => {
        const first = newsItems?.[0];
        return first ? (
          <Space>
            <FileTextOutlined />
            <span>{first.title}</span>
            {newsItems.length > 1 ? (
              <Tag color="blue">共 {newsItems.length} 篇</Tag>
            ) : null}
          </Space>
        ) : '-';
      },
    },
    {
      title: '作者',
      dataIndex: ['content', 'news_item'],
      width: 120,
      render: (newsItems: WechatAPI.DraftNewsItem[]) => newsItems?.[0]?.author || '-',
    },
    {
      title: '摘要',
      dataIndex: ['content', 'news_item'],
      ellipsis: true,
      render: (newsItems: WechatAPI.DraftNewsItem[]) => newsItems?.[0]?.digest || '-',
    },
    {
      title: '更新时间',
      dataIndex: 'update_time',
      width: 180,
      render: (time: number) => dayjs.unix(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      width: 200,
      render: (_, record) => {
        const firstItem = record.content?.news_item?.[0];
        return (
          <Space>
            {firstItem ? (
              <a onClick={() => handlePreview(firstItem.title, firstItem.content)}>
                <EyeOutlined /> 预览
              </a>
            ) : null}
            <Popconfirm
              title="确定发布此草稿？"
              onConfirm={() => handlePublish(record.media_id)}
            >
              <a style={{ color: '#07c160' }}>
                <SendOutlined /> 发布
              </a>
            </Popconfirm>
            <Popconfirm
              title="确定删除此草稿？"
              onConfirm={() => handleDeleteDraft(record.media_id)}
            >
              <a style={{ color: '#ff4d4f' }}>
                <DeleteOutlined /> 删除
              </a>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  // 已发布表格列
  const publishedColumns: ColumnsType<WechatAPI.PublishedListItem> = [
    {
      title: '标题',
      dataIndex: ['content', 'news_item'],
      width: 300,
      render: (newsItems: WechatAPI.PublishedNewsItem[]) => {
        const first = newsItems?.[0];
        return first ? (
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>{first.title}</span>
            {newsItems.length > 1 ? (
              <Tag color="blue">共 {newsItems.length} 篇</Tag>
            ) : null}
          </Space>
        ) : '-';
      },
    },
    {
      title: '作者',
      dataIndex: ['content', 'news_item'],
      width: 120,
      render: (newsItems: WechatAPI.PublishedNewsItem[]) => newsItems?.[0]?.author || '-',
    },
    {
      title: '摘要',
      dataIndex: ['content', 'news_item'],
      ellipsis: true,
      render: (newsItems: WechatAPI.PublishedNewsItem[]) => newsItems?.[0]?.digest || '-',
    },
    {
      title: '状态',
      width: 100,
      render: (_, record) => {
        const first = record.content?.news_item?.[0];
        return first?.is_deleted ? (
          <Tag color="red">已删除</Tag>
        ) : (
          <Tag color="green">已发布</Tag>
        );
      },
    },
    {
      title: '发布时间',
      dataIndex: 'update_time',
      width: 180,
      render: (time: number) => dayjs.unix(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      width: 160,
      render: (_, record) => {
        const firstItem = record.content?.news_item?.[0];
        return (
          <Space>
            {firstItem?.url ? (
              <a href={firstItem.url} target="_blank" rel="noopener noreferrer">
                <EyeOutlined /> 查看
              </a>
            ) : firstItem ? (
              <a onClick={() => handlePreview(firstItem.title, firstItem.content)}>
                <EyeOutlined /> 预览
              </a>
            ) : null}
            <Popconfirm
              title="确定删除此文章？"
              onConfirm={() => handleDeletePublished(record.article_id)}
            >
              <a style={{ color: '#ff4d4f' }}>
                <DeleteOutlined /> 删除
              </a>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const tabItems = [
    {
      key: 'drafts',
      label: (
        <span>
          <FileTextOutlined /> 草稿箱
        </span>
      ),
      children: (
        <Table
          rowKey="media_id"
          columns={draftColumns}
          dataSource={drafts}
          loading={draftsLoading}
          pagination={{
            current: draftsPage,
            pageSize,
            total: draftsTotal,
            onChange: setDraftsPage,
            showTotal: (total) => `共 ${total} 条`,
          }}
          locale={{
            emptyText: <Empty description="暂无草稿" />,
          }}
        />
      ),
    },
    {
      key: 'published',
      label: (
        <span>
          <CheckCircleOutlined /> 已发布
        </span>
      ),
      children: (
        <Table
          rowKey="article_id"
          columns={publishedColumns}
          dataSource={published}
          loading={publishedLoading}
          pagination={{
            current: publishedPage,
            pageSize,
            total: publishedTotal,
            onChange: setPublishedPage,
            showTotal: (total) => `共 ${total} 条`,
          }}
          locale={{
            emptyText: <Empty description="暂无已发布文章" />,
          }}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title={
        <Space>
          <WechatOutlined style={{ color: '#07c160', fontSize: 24 }} />
          公众号文章
        </Space>
      }
      subTitle="管理微信公众号草稿和已发布文章"
    >
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          tabBarExtraContent={
            <Button
              onClick={() => {
                if (activeTab === 'drafts') {
                  loadDrafts(draftsPage);
                } else {
                  loadPublished(publishedPage);
                }
              }}
            >
              刷新
            </Button>
          }
        />
      </Card>

      {/* 预览弹窗 */}
      <Modal
        title={previewTitle}
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={<Button onClick={() => setPreviewOpen(false)}>关闭</Button>}
        width={700}
      >
        <div
          style={{
            maxHeight: 500,
            overflow: 'auto',
            padding: 16,
            border: '1px solid #f0f0f0',
            borderRadius: 8,
          }}
          dangerouslySetInnerHTML={{ __html: previewContent }}
        />
      </Modal>
    </PageContainer>
  );
};

export default WechatArticles;
