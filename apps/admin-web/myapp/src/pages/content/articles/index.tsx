import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  TranslationOutlined,
  SearchOutlined,
  WechatOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { App, Button, Popconfirm, Tag, Dropdown, Tooltip } from 'antd';
import React, { useRef, useCallback } from 'react';
import { history } from '@umijs/max';
import {
  getArticles,
  deleteArticle,
  publishArticle,
  unpublishArticle,
  translateArticle,
  optimizeArticleSeo,
} from '@/services/blog/article';

const ArticleList: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const { message } = App.useApp();

  const handleDelete = async (id: string) => {
    try {
      await deleteArticle(id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  const handleTogglePublish = async (record: BlogAPI.ArticleWithRelations) => {
    try {
      if (record.isPublished) {
        await unpublishArticle(record.id);
        message.success('已取消发布');
      } else {
        await publishArticle(record.id);
        message.success('发布成功');
      }
      actionRef.current?.reload();
    } catch {
      message.error('操作失败');
    }
  };

  const handleTranslate = async (id: string) => {
    message.loading({ content: 'AI 翻译中...', key: 'translate' });
    try {
      const result = await translateArticle(id, { createNewArticle: true });
      message.success({ content: '翻译完成，已创建新文章', key: 'translate' });
      if (result.newArticleId) {
        history.push(`/content/articles/${result.newArticleId}`);
      }
    } catch {
      message.error({ content: '翻译失败', key: 'translate' });
    }
  };

  const handleSeoOptimize = async (id: string) => {
    message.loading({ content: 'AI 生成 SEO 中...', key: 'seo' });
    try {
      await optimizeArticleSeo(id);
      message.success({ content: 'SEO 信息已更新', key: 'seo' });
      actionRef.current?.reload();
    } catch {
      message.error({ content: 'SEO 优化失败', key: 'seo' });
    }
  };

  const getMoreMenuItems = useCallback(
    (record: BlogAPI.ArticleWithRelations) => [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: '查看详情',
        onClick: () => history.push(`/content/articles/${record.id}`),
      },
      {
        key: 'publish',
        label: record.isPublished ? '取消发布' : '发布',
        onClick: () => handleTogglePublish(record),
      },
      { type: 'divider' as const },
      {
        key: 'translate',
        icon: <TranslationOutlined />,
        label: 'AI 翻译',
        onClick: () => handleTranslate(record.id),
      },
      {
        key: 'seo',
        icon: <SearchOutlined />,
        label: 'AI 生成 SEO',
        onClick: () => handleSeoOptimize(record.id),
      },
      {
        key: 'wechat',
        icon: <WechatOutlined style={{ color: '#07c160' }} />,
        label: '发布到微信',
        onClick: () => history.push(`/content/articles/${record.id}`),
      },
      { type: 'divider' as const },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除',
        danger: true,
        onClick: () => handleDelete(record.id),
      },
    ],
    [],
  );

  const columns: ProColumns<BlogAPI.ArticleWithRelations>[] = [
    {
      title: '文章信息',
      dataIndex: 'title',
      width: 360,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {record.coverImage ? (
            <img
              src={record.coverImage}
              alt=""
              style={{
                width: 64,
                height: 42,
                objectFit: 'cover',
                borderRadius: 4,
                flexShrink: 0,
              }}
            />
          ) : null}
          <div style={{ minWidth: 0 }}>
            <a
              onClick={() => history.push(`/content/articles/${record.id}`)}
              style={{ fontWeight: 500, display: 'block' }}
              title={record.title}
            >
              {record.title}
            </a>
            {record.summary ? (
              <div
                style={{
                  color: '#999',
                  fontSize: 12,
                  marginTop: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={record.summary}
              >
                {record.summary}
              </div>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      title: '分类 / 标签',
      dataIndex: 'category',
      search: false,
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ marginBottom: 4 }}>
            {record.category ? record.category.name : <span style={{ color: '#bbb' }}>未分类</span>}
          </div>
          {record.tags && record.tags.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {record.tags.slice(0, 3).map((tag) => (
                <Tag key={tag.id} style={{ margin: 0, fontSize: 11 }}>
                  {tag.name}
                </Tag>
              ))}
              {record.tags.length > 3 ? (
                <Tooltip title={record.tags.slice(3).map((t) => t.name).join('、')}>
                  <Tag style={{ margin: 0, fontSize: 11 }}>+{record.tags.length - 3}</Tag>
                </Tooltip>
              ) : null}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isPublished',
      width: 80,
      valueType: 'select',
      valueEnum: {
        true: { text: '已发布', status: 'Success' },
        false: { text: '草稿', status: 'Default' },
      },
      render: (_, record) => (
        <Tag color={record.isPublished ? 'green' : 'default'}>
          {record.isPublished ? '已发布' : '草稿'}
        </Tag>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      search: false,
      width: 160,
      sorter: true,
      render: (_, record) => {
        const date = record.updatedAt || record.createdAt;
        return date ? new Date(date).toLocaleString('zh-CN') : '-';
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      fixed: 'right',
      render: (_, record) => [
        <a key="edit" onClick={() => history.push(`/content/articles/edit/${record.id}`)}>
          <EditOutlined /> 编辑
        </a>,
        <Dropdown key="more" menu={{ items: getMoreMenuItems(record) }} trigger={['click']}>
          <a><MoreOutlined /> 更多</a>
        </Dropdown>,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable<BlogAPI.ArticleWithRelations>
        headerTitle="文章列表"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 80,
          defaultCollapsed: true,
        }}
        toolBarRender={() => [
          <Button
            type="primary"
            key="create"
            onClick={() => history.push('/content/articles/create')}
          >
            <PlusOutlined /> 新建文章
          </Button>,
        ]}
        request={async (params) => {
          const { current, pageSize, title, isPublished } = params;
          const res = await getArticles({
            page: current,
            limit: pageSize,
            keyword: title,
            isPublished: isPublished === 'true' ? true : isPublished === 'false' ? false : undefined,
          });
          return {
            data: res.data,
            success: true,
            total: res.total,
          };
        }}
        columns={columns}
        pagination={{
          defaultPageSize: 15,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 篇文章`,
        }}
        scroll={{ x: 920 }}
      />
    </PageContainer>
  );
};

export default ArticleList;