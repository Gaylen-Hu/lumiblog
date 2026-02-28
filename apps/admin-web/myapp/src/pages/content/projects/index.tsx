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
  ProFormSelect,
} from '@ant-design/pro-components';
import { App, Button, Popconfirm, Space, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from '@/services/blog/project';

const ProjectList: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const { message } = App.useApp();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<BlogAPI.Project>();

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const columns: ProColumns<BlogAPI.Project>[] = [
    {
      title: '项目名称',
      dataIndex: 'title',
      width: 180,
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
      search: false,
    },
    {
      title: '技术栈',
      dataIndex: 'techStack',
      search: false,
      width: 220,
      render: (_, record) =>
        record.techStack?.map((tech) => (
          <Tag key={tech} color="blue">
            {tech}
          </Tag>
        )),
    },
    {
      title: '精选',
      dataIndex: 'featured',
      search: false,
      width: 80,
      render: (_, record) =>
        record.featured ? (
          <Tag color="gold">精选</Tag>
        ) : (
          <Tag>普通</Tag>
        ),
    },
    {
      title: '排序',
      dataIndex: 'order',
      search: false,
      width: 80,
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
              setCurrentRow({
                ...record,
                techStack: record.techStack ?? [],
              });
              setEditModalOpen(true);
            }}
          >
            编辑
          </a>
          <Popconfirm
            title="确定删除此项目？"
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
        name="title"
        label="项目名称"
        placeholder="请输入项目名称"
        rules={[
          { required: true, message: '请输入项目名称' },
          { max: 100, message: '项目名称不能超过100个字符' },
        ]}
      />
      <ProFormTextArea
        name="description"
        label="项目描述"
        placeholder="请输入项目描述"
        rules={[
          { required: true, message: '请输入项目描述' },
          { max: 500, message: '描述不能超过500个字符' },
        ]}
      />
      <ProFormSelect
        name="techStack"
        label="技术栈"
        placeholder="输入后按回车添加"
        fieldProps={{ mode: 'tags' }}
      />
      <ProFormText
        name="coverImage"
        label="封面图URL"
        placeholder="请输入封面图URL（可选）"
      />
      <ProFormText
        name="link"
        label="项目链接"
        placeholder="请输入项目链接（可选）"
        rules={[{ type: 'url', message: '请输入有效的URL' }]}
      />
      <ProFormText
        name="githubUrl"
        label="GitHub 链接"
        placeholder="请输入GitHub仓库链接（可选）"
        rules={[{ type: 'url', message: '请输入有效的URL' }]}
      />
      <ProFormSwitch name="featured" label="精选项目" />
      <ProFormDigit
        name="order"
        label="排序"
        placeholder="数字越小越靠前"
        min={0}
        fieldProps={{ precision: 0 }}
      />
    </>
  );

  return (
    <PageContainer>
      <ProTable<BlogAPI.Project>
        headerTitle="项目列表"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <Button
            type="primary"
            key="create"
            onClick={() => setCreateModalOpen(true)}
          >
            <PlusOutlined /> 新建项目
          </Button>,
        ]}
        request={async (params) => {
          const res = await getProjects({
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
        title="新建项目"
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        initialValues={{ featured: false, order: 0 }}
        onFinish={async (values) => {
          try {
            await createProject(values as BlogAPI.CreateProjectParams);
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
        {formFields}
      </ModalForm>

      <ModalForm
        title="编辑项目"
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        initialValues={currentRow}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          if (!currentRow) return false;
          try {
            await updateProject(
              currentRow.id,
              values as BlogAPI.UpdateProjectParams,
            );
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
        {formFields}
      </ModalForm>
    </PageContainer>
  );
};

export default ProjectList;
