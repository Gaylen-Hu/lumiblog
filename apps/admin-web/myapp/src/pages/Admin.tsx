import { PageContainer } from '@ant-design/pro-components';
import { Card, Typography } from 'antd';
import React from 'react';

const Admin: React.FC = () => {
  return (
    <PageContainer content="此页面仅管理员可见">
      <Card>
        <Typography.Title level={4} style={{ textAlign: 'center', margin: 0 }}>
          管理员控制台
        </Typography.Title>
      </Card>
    </PageContainer>
  );
};

export default Admin;
