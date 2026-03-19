import { PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  PageContainer,
  ProTable,
  ModalForm,
  ProFormText,
  ProFormTextArea,
  ProFormDigit,
  ProFormSwitch,
} from '@ant-design/pro-components';
import { App, Button, Popconfirm, Space, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import {
  getTimelines,
  createTimeline,
  updateTimeline,
  deleteTimeline,
} from '@/services/blog/timeline';

const TimelineList: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const { message } = App.useApp();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<BlogAPI.Timeline>();

  const handleDelete = async (id: string) => {
    try {
      await deleteTimeline(id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  const columns: ProColumns<BlogAPI.Timeline>[] = [
    {
      title: '年份',
      dataIndex: 'year',
      width: 80,
      search: false,
    },
    {
      title: '中文标题',
      dataIndex: 'titleZh',
      width: 180,
      search: false,
    },
    {
      title: '中文描述',
      dataIndex: 'descZh',
      ellipsis: true,
      search: false,
    },
    {
      title: '排序',
      dataIndex: 'order',
      width: 80,
      search: false,
    },
    {
      title: '是否可见',
      dataIndex: 'isVisible',
      width: 100,
      search: false,
      render: (_, record) =>
        record.isVisible ? (
          <Tag color="green">可见</Tag>
        ) : (
          <Tag color="default">隐藏</Tag>
        ),
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
            title="确定删除此条目？"
            onConfirm={() => handleDelete(record.id)}
          >
            <a style={{ color: '#ff4d4f' }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const formFields = (
    <>
      <ProFormText
        name="year"
        label="年份"
        placeholder="请输入4位年份，如 2017"
        rules={[
          { required: true, message: '请输入年份' },
          { pattern: /^\d{4}$/, message: '年份必须为4位数字' },
        ]}
      />
      <ProFormText
        name="titleZh"
        label="中文标题"
        placeholder="请输入中文标题"
        rules={[
          { required: true, message: '请输入中文标题' },
          { max: 100, message: '中文标题不能超过100个字符' },
        ]}
      />
      <ProFormText
        name="titleEn"
        label="英文标题"
        placeholder="Please enter English title"
        rules={[
          { required: true, message: '请输入英文标题' },
          { max: 100, message: '英文标题不能超过100个字符' },
        ]}
      />
      <ProFormTextArea
        name="descZh"
        label="中文描述"
        placeholder="请输入中文描述"
        rules={[
          { required: true, message: '请输入中文描述' },
          { max: 500, message: '中文描述不能超过500个字符' },
        ]}
      />
      <ProFormTextArea
        name="descEn"
        label="英文描述"
        placeholder="Please enter English description"
        rules={[
          { required: true, message: '请输入英文描述' },
          { max: 500, message: '英文描述不能超过500个字符' },
        ]}
      />
      <ProFormDigit
        name="order"
        label="排序"
        placeholder="数字越小越靠前"
        min={0}
        max={9999}
        fieldProps={{ precision: 0 }}
      />
      <ProFormSwitch name="isVisible" label="是否可见" />
    </>
  );

  return (
    <PageContainer>
      <ProTable<BlogAPI.Timeline>
        headerTitle="时间轴列表"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <Button
            type="primary"
            key="create"
            onClick={() => setCreateModalOpen(true)}
          >
            <PlusOutlined /> 新建条目
          </Button>,
        ]}
        request={async (params) => {
          const res = await getTimelines({
            page: params.current,
            limit: params.pageSize,
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

      <ModalForm
        title="新建条目"
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        initialValues={{ order: 0, isVisible: true }}
        onFinish={async (values) => {
          try {
            await createTimeline(values as BlogAPI.CreateTimelineParams);
            message.success('创建成功');
            setCreateModalOpen(false);
            actionRef.current?.reload();
            return true;
          } catch {
            message.error('创建失败');
            return false;
          }
        }}
      >
        {formFields}
      </ModalForm>

      <ModalForm
        title="编辑条目"
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        initialValues={currentRow}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          if (!currentRow) return false;
          try {
            await updateTimeline(
              currentRow.id,
              values as BlogAPI.UpdateTimelineParams,
            );
            message.success('更新成功');
            setEditModalOpen(false);
            actionRef.current?.reload();
            return true;
          } catch {
            message.error('更新失败');
            return false;
          }
        }}
      >
        {formFields}
      </ModalForm>
    </PageContainer>
  );
};

export default TimelineList;
