import { PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { App, Button, Modal, Space, Tag } from 'antd';
import React, { useRef } from 'react';
import { history } from '@umijs/max';
import { getColumns, deleteColumn } from '@/services/blog/column';

const ColumnList: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const { message } = App.useApp();

  const handleDelete = (record: BlogAPI.Column) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除专栏「${record.title}」吗？删除后将同时移除所有文章关联。`,
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteColumn(record.id);
          message.success('删除成功');
          actionRef.current?.reload();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const columns: ProColumns<BlogAPI.Column>[] = [
    {
      title: '专栏标题',
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: '文章数',
      dataIndex: 'articleCount',
      width: 80,
      search: false,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: {
        draft: { text: '草稿', status: 'Default' },
        published: { text: '已发布', status: 'Success' },
      },
      render: (_, record) =>
        record.status === 'published' ? (
          <Tag color="success">已发布</Tag>
        ) : (
          <Tag color="default">草稿</Tag>
        ),
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      width: 80,
      search: false,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      width: 180,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      render: (_, record) => (
        <Space>
          <a onClick={() => history.push(`/content/columns/edit/${record.id}`)}>
            编辑
          </a>
          <a style={{ color: '#ff4d4f' }} onClick={() => handleDelete(record)}>
            删除
          </a>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<BlogAPI.Column>
        headerTitle="专栏列表"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 'auto',
        }}
        toolBarRender={() => [
          <Button
            type="primary"
            key="create"
            onClick={() => history.push('/content/columns/edit')}
          >
            <PlusOutlined /> 新建专栏
          </Button>,
        ]}
        request={async (params) => {
          const res = await getColumns({
            page: params.current,
            limit: params.pageSize,
            keyword: params.title,
            status: params.status,
          });
          return {
            data: res.data,
            success: true,
            total: res.total,
          };
        }}
        columns={columns}
        pagination={{ defaultPageSize: 10 }}
      />
    </PageContainer>
  );
};

export default ColumnList;
