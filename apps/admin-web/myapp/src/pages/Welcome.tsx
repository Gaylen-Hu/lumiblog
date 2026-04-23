import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, Row, Statistic, theme } from 'antd';
import {
  FileTextOutlined,
  TagsOutlined,
  FolderOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import React from 'react';
import { history } from '@umijs/max';

const statCards = [
  {
    title: '文章管理',
    icon: <FileTextOutlined style={{ fontSize: 28 }} />,
    path: '/content/articles',
    color: '#1677ff',
  },
  {
    title: '分类管理',
    icon: <FolderOutlined style={{ fontSize: 28 }} />,
    path: '/content/categories',
    color: '#52c41a',
  },
  {
    title: '标签管理',
    icon: <TagsOutlined style={{ fontSize: 28 }} />,
    path: '/content/tags',
    color: '#faad14',
  },
  {
    title: '媒体管理',
    icon: <PictureOutlined style={{ fontSize: 28 }} />,
    path: '/content/media',
    color: '#722ed1',
  },
];

const Welcome: React.FC = () => {
  const { token } = theme.useToken();

  return (
    <PageContainer>
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, color: token.colorTextHeading, marginBottom: 8 }}>
          欢迎回来
        </div>
        <div style={{ color: token.colorTextSecondary }}>
          博客内容管理系统 — 在这里管理你的文章、分类、标签和媒体资源。
        </div>
      </Card>
      <Row gutter={[16, 16]}>
        {statCards.map((item) => (
          <Col xs={24} sm={12} lg={6} key={item.path}>
            <Card
              hoverable
              onClick={() => history.push(item.path)}
              style={{ textAlign: 'center' }}
            >
              <Statistic
                title={item.title}
                prefix={React.cloneElement(item.icon, { style: { ...item.icon.props.style, color: item.color } })}
                value=" "
                valueStyle={{ fontSize: 0 }}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </PageContainer>
  );
};

export default Welcome;
