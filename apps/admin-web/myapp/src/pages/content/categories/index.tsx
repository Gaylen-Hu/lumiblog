import { PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  PageContainer,
  ProTable,
  ModalForm,
  ProFormText,
  ProFormTextArea,
  ProFormDigit,
  ProFormTreeSelect,
} from '@ant-design/pro-components';
import { App, Button, Popconfirm, Space, Tooltip } from 'antd';
import React, { useRef, useState, useCallback } from 'react';
import {
  getCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/services/blog/category';

/** 扩展分类类型，添加子分类数量 */
interface CategoryWithChildren extends BlogAPI.Category {
  childrenCount?: number;
}

/** 将树形结构转换为带子分类数量的扁平列表 */
function flattenTreeWithChildrenCount(
  tree: BlogAPI.CategoryTreeNode[],
): CategoryWithChildren[] {
  const result: CategoryWithChildren[] = [];

  function traverse(nodes: BlogAPI.CategoryTreeNode[]) {
    for (const node of nodes) {
      const { children, ...category } = node;
      result.push({
        ...category,
        childrenCount: children.length,
      });
      if (children.length > 0) {
        traverse(children);
      }
    }
  }

  traverse(tree);
  return result;
}

/** 将树形结构转换为 TreeSelect 数据格式 */
function convertToTreeSelectData(
  tree: BlogAPI.CategoryTreeNode[],
  excludeId?: string,
): { title: string; value: string; children?: { title: string; value: string }[] }[] {
  return tree
    .filter((node) => node.id !== excludeId)
    .map((node) => ({
      title: node.name,
      value: node.id,
      children:
        node.children.length > 0
          ? convertToTreeSelectData(node.children, excludeId)
          : undefined,
    }));
}

const CategoryList: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const { message } = App.useApp();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<CategoryWithChildren>();
  const [treeData, setTreeData] = useState<BlogAPI.CategoryTreeNode[]>([]);

  /** 加载分类树数据 */
  const loadTreeData = useCallback(async () => {
    try {
      const data = await getCategoryTree();
      setTreeData(data);
      return data;
    } catch {
      message.error('加载分类树失败');
      return [];
    }
  }, [message]);

  /** 处理删除分类 */
  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败，请重试');
    }
  };

  const columns: ProColumns<CategoryWithChildren>[] = [
    {
      title: '分类名称',
      dataIndex: 'name',
      render: (_, record) => (
        <span style={{ paddingLeft: record.level * 20 }}>
          {record.level > 0 ? '└ ' : ''}
          {record.name}
        </span>
      ),
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
      title: '层级',
      dataIndex: 'level',
      search: false,
      width: 80,
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
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
              setCurrentRow(record);
              setEditModalOpen(true);
            }}
          >
            编辑
          </a>
          {record.childrenCount && record.childrenCount > 0 ? (
            <Tooltip title="存在子分类，无法删除">
              <span style={{ color: '#999', cursor: 'not-allowed' }}>删除</span>
            </Tooltip>
          ) : (
            <Popconfirm
              title="确定删除此分类？"
              onConfirm={() => handleDelete(record.id)}
            >
              <a style={{ color: '#ff4d4f' }}>删除</a>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<CategoryWithChildren>
        headerTitle="分类列表"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <Button
            type="primary"
            key="create"
            onClick={async () => {
              await loadTreeData();
              setCreateModalOpen(true);
            }}
          >
            <PlusOutlined /> 新建分类
          </Button>,
        ]}
        request={async () => {
          const tree = await loadTreeData();
          const data = flattenTreeWithChildrenCount(tree);
          return {
            data,
            success: true,
            total: data.length,
          };
        }}
        columns={columns}
      />

      {/* 新建分类弹窗 */}
      <ModalForm
        title="新建分类"
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          try {
            await createCategory(values as BlogAPI.CreateCategoryParams);
            message.success('创建成功');
            setCreateModalOpen(false);
            actionRef.current?.reload();
            return true;
          } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            const errorMsg = err?.response?.data?.message;
            if (errorMsg?.includes('already exists') || errorMsg?.includes('已存在')) {
              message.error('分类名称/Slug 已存在');
            } else {
              message.error('创建失败，请重试');
            }
            return false;
          }
        }}
      >
        <ProFormText
          name="name"
          label="分类名称"
          placeholder="请输入分类名称"
          rules={[
            { required: true, message: '请输入分类名称' },
            { max: 50, message: '分类名称不能超过50个字符' },
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
          placeholder="请输入分类描述（可选）"
          rules={[{ max: 200, message: '描述不能超过200个字符' }]}
        />
        <ProFormTreeSelect
          name="parentId"
          label="父分类"
          placeholder="请选择父分类（可选）"
          allowClear
          fieldProps={{
            treeData: convertToTreeSelectData(treeData),
            treeDefaultExpandAll: true,
          }}
        />
        <ProFormDigit
          name="sortOrder"
          label="排序"
          placeholder="请输入排序值（数字越小越靠前）"
          initialValue={0}
          min={0}
          max={9999}
        />
      </ModalForm>

      {/* 编辑分类弹窗 */}
      <ModalForm
        title="编辑分类"
        open={editModalOpen}
        onOpenChange={async (open) => {
          if (open && currentRow) {
            await loadTreeData();
          }
          setEditModalOpen(open);
        }}
        initialValues={currentRow}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          if (!currentRow) return false;
          try {
            await updateCategory(currentRow.id, values as BlogAPI.UpdateCategoryParams);
            message.success('更新成功');
            setEditModalOpen(false);
            actionRef.current?.reload();
            return true;
          } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            const errorMsg = err?.response?.data?.message;
            if (errorMsg?.includes('already exists') || errorMsg?.includes('已存在')) {
              message.error('分类名称/Slug 已存在');
            } else {
              message.error('更新失败，请重试');
            }
            return false;
          }
        }}
      >
        <ProFormText
          name="name"
          label="分类名称"
          placeholder="请输入分类名称"
          rules={[
            { required: true, message: '请输入分类名称' },
            { max: 50, message: '分类名称不能超过50个字符' },
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
          placeholder="请输入分类描述（可选）"
          rules={[{ max: 200, message: '描述不能超过200个字符' }]}
        />
        <ProFormDigit
          name="sortOrder"
          label="排序"
          placeholder="请输入排序值（数字越小越靠前）"
          min={0}
          max={9999}
        />
      </ModalForm>
    </PageContainer>
  );
};

export default CategoryList;
