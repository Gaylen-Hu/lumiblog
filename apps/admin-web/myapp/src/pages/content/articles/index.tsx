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
import { App, Button, Popconfirm, Space, Tag, Image, Dropdown } from 'antd';
import React, { useRef } from 'react';
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

  const getMoreMenuItems = (record: BlogAPI.ArticleWithRelations) => [
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
  ];

  const columns: ProColumns<BlogAPI.ArticleWithRelations>[] = [
    {
      title: '封面',
      dataIndex: 'coverImage',
      search: false,
      width: 100,
      render: (_, record) =>
        record.coverImage ? (
          <Image src={record.coverImage} width={80} height={50} style={{ objectFit: 'cover' }} />
        ) : (
          <span style={{ color: '#999' }}>无封面</span>
        ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      width: 200,
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      copyable: true,
      ellipsis: true,
      width: 150,
      search: false,
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      ellipsis: true,
      search: false,
    },
    {
      title: '分类',
      dataIndex: ['category', 'name'],
      search: false,
      width: 100,
      render: (_, record) =>
        record.category ? record.category.name : <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      search: false,
      width: 150,
      render: (_, record) =>
        record.tags && record.tags.length > 0 ? (
          <Space size={[0, 4]} wrap>
            {record.tags.map((tag) => (
              <Tag key={tag.id} color="blue">
                {tag.name}
              </Tag>
            ))}
          </Space>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        ),
    },
    {
      title: '阅读量',
      dataIndex: 'viewCount',
      search: false,
      width: 80,
      sorter: true,
    },
    {
      title: '状态',
      dataIndex: 'isPublished',
      width: 100,
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
      title: '发布时间',
      dataIndex: 'publishedAt',
      valueType: 'dateTime',
      search: false,
      width: 160,
      render: (_, record) => (record.publishedAt ? _ : '-'),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      search: false,
      width: 160,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      render: (_, record) => (
        <Space>
          <a onClick={() => history.push(`/content/articles/${record.id}`)}>
            <EyeOutlined /> 查看
          </a>
          <a onClick={() => history.push(`/content/articles/edit/${record.id}`)}>
            <EditOutlined /> 编辑
          </a>
          <a onClick={() => handleTogglePublish(record)}>
            {record.isPublished ? '取消发布' : '发布'}
          </a>
          <Dropdown menu={{ items: getMoreMenuItems(record) }}>
            <a><MoreOutlined /></a>
          </Dropdown>
          <Popconfirm title="确定删除此文章？" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>
              <DeleteOutlined />
            </a>
          </Popconfirm>
        </Space>
      ),
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
          defaultPageSize: 10,
          showSizeChanger: true,
        }}
      />
    </PageContainer>
  );
};

export default ArticleList;
