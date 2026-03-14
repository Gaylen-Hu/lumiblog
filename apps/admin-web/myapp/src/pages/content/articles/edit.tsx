import {
  PageContainer,
  ProForm,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProFormTreeSelect,
} from '@ant-design/pro-components';
import { App, Card, Spin } from 'antd';
import React, { useEffect, useState, useMemo } from 'react';

// 纯函数提到组件外，避免每次渲染重新创建
function convertToTreeSelectData(
  nodes: BlogAPI.CategoryTreeNode[],
): { title: string; value: string; children?: { title: string; value: string }[] }[] {
  return nodes.map((node) => ({
    title: node.name,
    value: node.id,
    children: node.children?.length ? convertToTreeSelectData(node.children) : undefined,
  }));
}
import { history, useParams } from '@umijs/max';
import { getArticle, createArticle, updateArticle } from '@/services/blog/article';
import { getCategoryTree } from '@/services/blog/category';
import { getTags } from '@/services/blog/tag';
import MarkdownEditor, { clearMarkdownDraft } from '@/components/MarkdownEditor';

const ArticleEdit: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState<BlogAPI.Article>();
  const [categoryTreeData, setCategoryTreeData] = useState<BlogAPI.CategoryTreeNode[]>([]);
  const [tagsData, setTagsData] = useState<BlogAPI.Tag[]>([]);

  // 并行获取分类树和标签数据
  useEffect(() => {
    Promise.all([
      getCategoryTree().catch(() => {
        message.error('获取分类列表失败');
        return [];
      }),
      getTags().catch(() => {
        message.error('获取标签列表失败');
        return [];
      }),
    ]).then(([categoryData, tagData]) => {
      setCategoryTreeData(categoryData);
      setTagsData(tagData);
    });
  }, [message]);

  // 缓存转换结果，categoryTreeData 不变时不重新计算
  const treeSelectData = useMemo(
    () => convertToTreeSelectData(categoryTreeData),
    [categoryTreeData],
  );

  useEffect(() => {
    if (isEdit && id) {
      setLoading(true);
      getArticle(id)
        .then((data) => setInitialValues(data))
        .catch(() => message.error('获取文章失败'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit, message]);

  const handleSubmit = async (values: BlogAPI.CreateArticleParams) => {
    try {
      if (isEdit && id) {
        await updateArticle(id, values);
        message.success('更新成功');
      } else {
        await createArticle(values);
        message.success('创建成功');
      }
      // Clear the draft after successful save
      clearMarkdownDraft(`article-${id || 'new'}`);
      history.push('/content/articles');
    } catch {
      message.error(isEdit ? '更新失败' : '创建失败');
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <Card>
          <Spin />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={isEdit ? '编辑文章' : '新建文章'}>
      <Card>
        <ProForm<BlogAPI.CreateArticleParams>
          initialValues={initialValues}
          onFinish={handleSubmit}
          submitter={{
            searchConfig: { submitText: isEdit ? '保存' : '创建' },
            resetButtonProps: { style: { display: 'none' } },
          }}
        >
          <ProFormText
            name="title"
            label="标题"
            placeholder="请输入文章标题"
            rules={[
              { required: true, message: '请输入标题' },
              { max: 200, message: '标题不能超过200个字符' },
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
          <ProFormTreeSelect
            name="categoryId"
            label="分类"
            placeholder="请选择分类（可选）"
            fieldProps={{
              treeData: treeSelectData,
              showSearch: true,
              treeNodeFilterProp: 'title',
              allowClear: true,
              treeLine: true,
            }}
          />
          <ProFormSelect
            name="tagIds"
            label="标签"
            placeholder="请选择标签（可选）"
            fieldProps={{
              mode: 'multiple',
              showSearch: true,
              optionFilterProp: 'label',
              allowClear: true,
            }}
            options={tagsData.map((tag) => ({
              label: tag.name,
              value: tag.id,
            }))}
          />
          <ProFormTextArea
            name="summary"
            label="摘要"
            placeholder="请输入文章摘要（可选）"
            rules={[{ max: 500, message: '摘要不能超过500个字符' }]}
            fieldProps={{ rows: 3 }}
          />
          <ProForm.Item
            name="content"
            label="正文"
          >
            <MarkdownEditor
              height={500}
              draftKey={`article-${id || 'new'}`}
            />
          </ProForm.Item>
          <ProFormText
            name="coverImage"
            label="封面图"
            placeholder="请输入封面图URL（可选）"
          />
          <ProFormText
            name="seoTitle"
            label="SEO 标题"
            placeholder="请输入SEO标题（可选）"
            rules={[{ max: 100, message: 'SEO标题不能超过100个字符' }]}
          />
          <ProFormTextArea
            name="seoDescription"
            label="SEO 描述"
            placeholder="请输入SEO描述（可选）"
            rules={[{ max: 300, message: 'SEO描述不能超过300个字符' }]}
            fieldProps={{ rows: 2 }}
          />
        </ProForm>
      </Card>
    </PageContainer>
  );
};

export default ArticleEdit;
