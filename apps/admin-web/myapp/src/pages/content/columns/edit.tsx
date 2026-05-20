import { PlusOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProForm,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import { App, Button, Card, Divider, Spin } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ProFormInstance } from '@ant-design/pro-components';
import {
  addColumnArticle,
  createColumn,
  getColumnDetail,
  reorderColumnArticles,
  removeColumnArticle,
  updateColumn,
} from '@/services/blog/column';
import ArticleSearchModal from './components/ArticleSearchModal';
import SortableArticleList from './components/SortableArticleList';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const ColumnEdit: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { message } = App.useApp();
  const formRef = useRef<ProFormInstance>(null);
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<BlogAPI.ColumnArticleItem[]>([]);
  const [initialArticleIds, setInitialArticleIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const existingArticleIds = useMemo(() => new Set(articles.map((a) => a.id)), [articles]);

  useEffect(() => {
    if (isEdit && id) {
      setLoading(true);
      getColumnDetail(id)
        .then((data) => {
          formRef.current?.setFieldsValue({
            title: data.title,
            slug: data.slug,
            description: data.description ?? '',
            coverImage: data.coverImage ?? '',
            sortOrder: data.sortOrder,
            status: data.status,
          });
          const sortedArticles = [...data.articles].sort((a, b) => a.sortOrder - b.sortOrder);
          setArticles(sortedArticles);
          setInitialArticleIds(sortedArticles.map((a) => a.id));
        })
        .catch(() => message.error('获取专栏详情失败'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit, message]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEdit) {
      const slug = generateSlug(e.target.value);
      formRef.current?.setFieldValue('slug', slug);
    }
  };

  const handleAddArticle = (article: BlogAPI.ColumnArticleItem) => {
    if (existingArticleIds.has(article.id)) return;
    setArticles((prev) => [...prev, { ...article, sortOrder: prev.length }]);
  };

  const handleRemoveArticle = (articleId: string) => {
    setArticles((prev) => prev.filter((a) => a.id !== articleId));
  };

  const handleReorder = (newArticles: BlogAPI.ColumnArticleItem[]) => {
    setArticles(newArticles);
  };

  const handleSubmit = async (values: BlogAPI.CreateColumnParams) => {
    setSubmitting(true);
    try {
      if (isEdit && id) {
        await updateColumn(id, values);
        const currentIds = articles.map((a) => a.id);
        const orderChanged =
          currentIds.length !== initialArticleIds.length ||
          currentIds.some((aid, i) => aid !== initialArticleIds[i]);

        // Handle removed articles
        const removedIds = initialArticleIds.filter((aid) => !existingArticleIds.has(aid));
        for (const articleId of removedIds) {
          await removeColumnArticle(id, articleId);
        }

        // Handle newly added articles
        const newIds = currentIds.filter((aid) => !new Set(initialArticleIds).has(aid));
        for (const articleId of newIds) {
          await addColumnArticle(id, { articleId });
        }

        // Reorder if order changed or articles were added/removed
        if (orderChanged || removedIds.length > 0 || newIds.length > 0) {
          const finalIds = articles.map((a) => a.id);
          if (finalIds.length > 0) {
            await reorderColumnArticles(id, { articleIds: finalIds });
          }
        }

        setInitialArticleIds(articles.map((a) => a.id));
        message.success('更新成功');
      } else {
        const column = await createColumn(values);
        // Add articles to the newly created column
        for (let i = 0; i < articles.length; i++) {
          await addColumnArticle(column.id, {
            articleId: articles[i].id,
            sortOrder: i,
          });
        }
        message.success('创建成功');
        history.replace(`/content/columns/edit/${column.id}`);
      }
    } catch {
      message.error(isEdit ? '更新失败' : '创建失败');
    } finally {
      setSubmitting(false);
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
    <PageContainer title={isEdit ? '编辑专栏' : '新建专栏'}>
      <Card>
        <ProForm<BlogAPI.CreateColumnParams>
          formRef={formRef}
          onFinish={handleSubmit}
          loading={submitting}
          initialValues={{ sortOrder: 0, status: 'draft' }}
          submitter={{
            searchConfig: { submitText: isEdit ? '保存' : '创建' },
            resetButtonProps: { style: { display: 'none' } },
          }}
        >
          <ProFormText
            name="title"
            label="标题"
            placeholder="请输入专栏标题"
            rules={[
              { required: true, message: '请输入标题' },
              { max: 100, message: '标题不能超过100个字符' },
            ]}
            fieldProps={{ onChange: handleTitleChange }}
          />
          <ProFormText
            name="slug"
            label="Slug"
            placeholder="URL 标识符，自动从标题生成"
            rules={[{ required: true, message: '请输入 Slug' }]}
          />
          <ProFormTextArea
            name="description"
            label="描述"
            placeholder="请输入专栏描述（可选）"
            rules={[{ max: 500, message: '描述不能超过500个字符' }]}
            fieldProps={{ rows: 3 }}
          />
          <ProFormText
            name="coverImage"
            label="封面图"
            placeholder="请输入封面图 URL（可选）"
          />
          <ProFormDigit
            name="sortOrder"
            label="排序"
            min={0}
            fieldProps={{ precision: 0 }}
          />
          <ProFormSelect
            name="status"
            label="状态"
            options={[
              { label: '草稿', value: 'draft' },
              { label: '已发布', value: 'published' },
            ]}
          />
        </ProForm>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>文章列表</h3>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            添加文章
          </Button>
        </div>
        <Divider style={{ margin: '0 0 16px' }} />
        <SortableArticleList
          articles={articles}
          onReorder={handleReorder}
          onRemove={handleRemoveArticle}
        />
      </Card>

      <ArticleSearchModal
        open={modalOpen}
        existingArticleIds={existingArticleIds}
        onAdd={handleAddArticle}
        onClose={() => setModalOpen(false)}
      />
    </PageContainer>
  );
};

export default ColumnEdit;
