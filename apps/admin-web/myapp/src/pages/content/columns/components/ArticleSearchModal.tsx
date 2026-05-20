import { Input, List, Modal, Tag } from 'antd';
import React, { useState } from 'react';
import { getArticles } from '@/services/blog/article';

interface ArticleSearchModalProps {
  open: boolean;
  existingArticleIds: Set<string>;
  onAdd: (article: BlogAPI.ColumnArticleItem) => void;
  onClose: () => void;
}

const ArticleSearchModal: React.FC<ArticleSearchModalProps> = ({
  open,
  existingArticleIds,
  onAdd,
  onClose,
}) => {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BlogAPI.ArticleWithRelations[]>([]);

  const handleSearch = async (value: string) => {
    setKeyword(value);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await getArticles({ keyword: value, limit: 20 });
      setResults(res.data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (article: BlogAPI.ArticleWithRelations) => {
    onAdd({
      id: article.id,
      title: article.title,
      slug: article.slug,
      isPublished: article.isPublished,
      publishedAt: article.publishedAt,
      sortOrder: 0,
    });
  };

  const handleClose = () => {
    setKeyword('');
    setResults([]);
    onClose();
  };

  return (
    <Modal
      title="添加文章到专栏"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={640}
      destroyOnClose
    >
      <Input.Search
        placeholder="搜索文章标题"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onSearch={handleSearch}
        enterButton="搜索"
        allowClear
        style={{ marginBottom: 16 }}
      />
      <List
        loading={loading}
        dataSource={results}
        locale={{ emptyText: keyword ? '未找到文章' : '请输入关键词搜索' }}
        renderItem={(article) => {
          const alreadyAdded = existingArticleIds.has(article.id);
          return (
            <List.Item
              actions={[
                alreadyAdded ? (
                  <Tag key="added" color="default">已添加</Tag>
                ) : (
                  <a key="add" onClick={() => handleAdd(article)}>添加</a>
                ),
              ]}
            >
              <List.Item.Meta
                title={article.title}
                description={
                  <span>
                    {article.slug}
                    {' '}
                    {article.isPublished ? (
                      <Tag color="success" style={{ marginLeft: 8 }}>已发布</Tag>
                    ) : (
                      <Tag color="default" style={{ marginLeft: 8 }}>草稿</Tag>
                    )}
                  </span>
                }
              />
            </List.Item>
          );
        }}
      />
    </Modal>
  );
};

export default ArticleSearchModal;
