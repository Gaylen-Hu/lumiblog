import { PageContainer } from '@ant-design/pro-components';
import {
  App,
  Card,
  Descriptions,
  Spin,
  Tag,
  Button,
  Space,
  Image,
  Dropdown,
  Modal,
  Typography,
} from 'antd';
import {
  EditOutlined,
  ArrowLeftOutlined,
  RobotOutlined,
  WechatOutlined,
  TranslationOutlined,
  SearchOutlined,
  DownOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import React, { useEffect, useState, useCallback } from 'react';
import { history, useParams } from '@umijs/max';
import {
  getArticle,
  translateArticle,
  optimizeArticleSeo,
} from '@/services/blog/article';
import WechatPublishModal from './components/WechatPublishModal';
import dayjs from 'dayjs';

const { Paragraph } = Typography;

const ArticleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<BlogAPI.Article>();

  // AI 翻译状态
  const [translateModalOpen, setTranslateModalOpen] = useState(false);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [translateResult, setTranslateResult] = useState<BlogAPI.TranslateArticleResponse>();

  // SEO 优化状态
  const [seoModalOpen, setSeoModalOpen] = useState(false);
  const [seoLoading, setSeoLoading] = useState(false);
  const [seoResult, setSeoResult] = useState<BlogAPI.SeoOptimizeResponse>();

  // 微信发布状态
  const [wechatModalOpen, setWechatModalOpen] = useState(false);

  const fetchArticle = useCallback(() => {
    if (id) {
      setLoading(true);
      getArticle(id)
        .then((data) => setArticle(data))
        .catch(() => message.error('获取文章失败'))
        .finally(() => setLoading(false));
    }
  }, [id, message]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  // AI 翻译
  const handleTranslate = async (createNewArticle: boolean) => {
    if (!id) return;
    setTranslateLoading(true);
    try {
      const result = await translateArticle(id, { createNewArticle });
      setTranslateResult(result);
      message.success(result.newArticleId ? '翻译完成，已创建新文章' : '翻译完成');
    } catch {
      message.error('翻译失败，请稍后重试');
    } finally {
      setTranslateLoading(false);
    }
  };

  // SEO 优化
  const handleSeoOptimize = async () => {
    if (!id) return;
    setSeoLoading(true);
    try {
      const result = await optimizeArticleSeo(id);
      setSeoResult(result);
      if (result.autoUpdated) {
        message.success('SEO 信息已自动更新到文章');
        fetchArticle();
      }
    } catch {
      message.error('SEO 优化失败，请稍后重试');
    } finally {
      setSeoLoading(false);
    }
  };

  const aiMenuItems = [
    {
      key: 'translate',
      icon: <TranslationOutlined />,
      label: 'AI 翻译成英文',
      onClick: () => setTranslateModalOpen(true),
    },
    {
      key: 'seo',
      icon: <SearchOutlined />,
      label: 'AI 生成 SEO',
      onClick: () => {
        setSeoModalOpen(true);
        handleSeoOptimize();
      },
    },
  ];

  if (loading) {
    return <PageContainer><Card><Spin /></Card></PageContainer>;
  }

  if (!article) {
    return <PageContainer><Card>文章不存在</Card></PageContainer>;
  }

  return (
    <PageContainer
      title={article.title}
      extra={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => history.push('/content/articles')}>
            返回列表
          </Button>
          <Dropdown menu={{ items: aiMenuItems }}>
            <Button icon={<RobotOutlined />}>AI 功能 <DownOutlined /></Button>
          </Dropdown>
          <Button
            icon={<WechatOutlined />}
            style={{ backgroundColor: '#07c160', borderColor: '#07c160', color: '#fff' }}
            onClick={() => setWechatModalOpen(true)}
          >
            发布到微信
          </Button>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => history.push(`/content/articles/edit/${id}`)}
          >
            编辑
          </Button>
        </Space>
      }
    >
      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="Slug">{article.slug}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={article.isPublished ? 'green' : 'default'}>
              {article.isPublished ? '已发布' : '草稿'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {dayjs(article.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="发布时间">
            {article.publishedAt ? dayjs(article.publishedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="摘要" span={2}>
            {article.summary || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="封面图" span={2}>
            {article.coverImage ? <Image src={article.coverImage} width={200} /> : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="正文内容" style={{ marginBottom: 16 }}>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {article.content || '暂无内容'}
        </pre>
      </Card>

      <Card title="SEO 信息">
        <Descriptions column={1}>
          <Descriptions.Item label="SEO 标题">{article.seoTitle || '-'}</Descriptions.Item>
          <Descriptions.Item label="SEO 描述">{article.seoDescription || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* AI 翻译弹窗 */}
      <Modal
        title={<><TranslationOutlined /> AI 翻译</>}
        open={translateModalOpen}
        onCancel={() => { setTranslateModalOpen(false); setTranslateResult(undefined); }}
        footer={null}
        width={700}
      >
        {translateResult ? (
          <div>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="翻译后标题">
                <Paragraph copyable>{translateResult.title}</Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="翻译后摘要">
                <Paragraph copyable>{translateResult.summary || '-'}</Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="翻译后内容">
                <Paragraph copyable ellipsis={{ rows: 5, expandable: true, symbol: '展开' }}>
                  {translateResult.content}
                </Paragraph>
              </Descriptions.Item>
            </Descriptions>
            {translateResult.newArticleId ? (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Button type="primary" onClick={() => history.push(`/content/articles/${translateResult.newArticleId}`)}>
                  查看新文章
                </Button>
              </div>
            ) : null}
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Button onClick={() => setTranslateResult(undefined)}>重新翻译</Button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ marginBottom: 24, color: '#666' }}>使用 AI 将文章翻译成英文版本</p>
            <Space direction="vertical" size="middle">
              <Button type="primary" icon={<CopyOutlined />} loading={translateLoading} onClick={() => handleTranslate(true)}>
                翻译并创建新文章
              </Button>
              <Button loading={translateLoading} onClick={() => handleTranslate(false)}>
                仅翻译（不创建文章）
              </Button>
            </Space>
          </div>
        )}
      </Modal>

      {/* SEO 优化弹窗 */}
      <Modal
        title={<><SearchOutlined /> AI 生成 SEO</>}
        open={seoModalOpen}
        onCancel={() => { setSeoModalOpen(false); setSeoResult(undefined); }}
        footer={<Button onClick={() => setSeoModalOpen(false)}>关闭</Button>}
        width={600}
      >
        {seoLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin tip="AI 正在分析文章内容..." />
          </div>
        ) : seoResult ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="SEO 标题"><Paragraph copyable>{seoResult.seoTitle}</Paragraph></Descriptions.Item>
            <Descriptions.Item label="SEO 描述"><Paragraph copyable>{seoResult.seoDescription}</Paragraph></Descriptions.Item>
            <Descriptions.Item label="关键词"><Paragraph copyable>{seoResult.keywords}</Paragraph></Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color="green">已自动更新到文章</Tag></Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>

      {/* 微信发布弹窗 */}
      <WechatPublishModal
        open={wechatModalOpen}
        articleId={id!}
        coverImage={article.coverImage}
        onClose={() => setWechatModalOpen(false)}
        onSuccess={() => fetchArticle()}
      />
    </PageContainer>
  );
};

export default ArticleDetail;
