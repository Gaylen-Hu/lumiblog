import { PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import { App, Button, Popconfirm, Space, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import { getTags, createTag, updateTag, deleteTag } from '@/services/blog/tag';

const TagList: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const { message } = App.useApp();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<BlogAPI.Tag>();

  const handleDelete = async (id: string) => {
    try {
      await deleteTag(id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const columns: ProColumns<BlogAPI.Tag>[] = [
    {
      title: '标签名称',
      dataIndex: 'name',
      render: (_, record) => <Tag color="blue">{record.name}</Tag>,
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      copyable: true,
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
      search: false,
    },
    {
      title: '文章数',
      dataIndex: 'articleCount',
      search: false,
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      search: false,
      width: 180,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      render: (_, record) => (
        <Space>
          <a
            onClick={() => {
              setCurrentRow(record);
              setEditModalOpen(true);
            }}
          >
            编辑
          </a>
          <Popconfirm
            title="确定删除此标签？"
            onConfirm={() => handleDelete(record.id)}
          >
            <a style={{ color: '#ff4d4f' }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<BlogAPI.Tag>
        headerTitle="标签列表"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <Button
            type="primary"
            key="create"
            onClick={() => setCreateModalOpen(true)}
          >
            <PlusOutlined /> 新建标签
          </Button>,
        ]}
        request={async () => {
          const data = await getTags();
          return {
            data,
            success: true,
            total: data.length,
          };
        }}
        columns={columns}
      />

      {/* 新建标签弹窗 */}
      <ModalForm
        title="新建标签"
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onFinish={async (values) => {
          try {
            await createTag(values as BlogAPI.CreateTagParams);
            message.success('创建成功');
            setCreateModalOpen(false);
            actionRef.current?.reload();
            return true;
          } catch (error) {
            message.error('创建失败');
            return false;
          }
        }}
      >
        <ProFormText
          name="name"
          label="标签名称"
          placeholder="请输入标签名称"
          rules={[
            { required: true, message: '请输入标签名称' },
            { max: 30, message: '标签名称不能超过30个字符' },
          ]}
        />
        <ProFormText
          name="slug"
          label="Slug"
          placeholder="请输入URL标识（小写字母、数字、连字符）"
          rules={[
            { required: true, message: '请输入Slug' },
            { pattern: /^[a-z0-9-]+$/, message: '只能包含小写字母、数字和连字符' },
          ]}
        />
        <ProFormTextArea
          name="description"
          label="描述"
          placeholder="请输入标签描述（可选）"
          rules={[{ max: 200, message: '描述不能超过200个字符' }]}
        />
      </ModalForm>

      {/* 编辑标签弹窗 */}
      <ModalForm
        title="编辑标签"
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        initialValues={currentRow}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          if (!currentRow) return false;
          try {
            await updateTag(currentRow.id, values as BlogAPI.UpdateTagParams);
            message.success('更新成功');
            setEditModalOpen(false);
            actionRef.current?.reload();
            return true;
          } catch (error) {
            message.error('更新失败');
            return false;
          }
        }}
      >
        <ProFormText
          name="name"
          label="标签名称"
          placeholder="请输入标签名称"
          rules={[
            { required: true, message: '请输入标签名称' },
            { max: 30, message: '标签名称不能超过30个字符' },
          ]}
        />
        <ProFormText
          name="slug"
          label="Slug"
          placeholder="请输入URL标识（小写字母、数字、连字符）"
          rules={[
            { required: true, message: '请输入Slug' },
            { pattern: /^[a-z0-9-]+$/, message: '只能包含小写字母、数字和连字符' },
          ]}
        />
        <ProFormTextArea
          name="description"
          label="描述"
          placeholder="请输入标签描述（可选）"
          rules={[{ max: 200, message: '描述不能超过200个字符' }]}
        />
      </ModalForm>
    </PageContainer>
  );
};

export default TagList;
