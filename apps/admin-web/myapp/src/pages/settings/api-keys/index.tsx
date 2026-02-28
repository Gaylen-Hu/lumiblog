import { PageContainer } from '@ant-design/pro-components';
import {
  App,
  Button,
  Card,
  Input,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useCallback, useEffect, useState } from 'react';
import { PlusOutlined, CopyOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { createApiKey, deleteApiKey, getApiKeys, revokeApiKey } from '@/services/blog/apiKey';
import dayjs from 'dayjs';

const { Paragraph, Text } = Typography;

const ApiKeysPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<BlogAPI.ApiKey[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getApiKeys();
      setKeys(data);
    } catch {
      message.error('加载 API Key 列表失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      message.warning('请输入 Key 名称');
      return;
    }
    try {
      setCreating(true);
      const result = await createApiKey({ name: newKeyName.trim() });
      setNewKeyResult(result.key);
      setNewKeyName('');
      loadKeys();
    } catch {
      message.error('创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeApiKey(id);
      message.success('已撤销');
      loadKeys();
    } catch {
      message.error('撤销失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteApiKey(id);
      message.success('已删除');
      loadKeys();
    } catch {
      message.error('删除失败');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => message.success('已复制到剪贴板'),
      () => message.error('复制失败'),
    );
  };

  const columns: ColumnsType<BlogAPI.ApiKey> = [
    {
      title: '名称',
      dataIndex: 'name',
      width: 200,
    },
    {
      title: 'Key',
      dataIndex: 'keyPrefix',
      width: 160,
      render: (prefix: string) => <Text code>{prefix}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'isRevoked',
      width: 100,
      render: (isRevoked: boolean) =>
        isRevoked ? <Tag color="red">已撤销</Tag> : <Tag color="green">有效</Tag>,
    },
    {
      title: '最后使用',
      dataIndex: 'lastUsedAt',
      width: 180,
      render: (val: string | null) => (val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '从未使用'),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 160,
      render: (_, record) => (
        <Space>
          {!record.isRevoked ? (
            <Popconfirm
              title="确定撤销此 Key？"
              description="撤销后使用此 Key 的请求将无法认证"
              icon={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
              onConfirm={() => handleRevoke(record.id)}
            >
              <Button type="link" size="small" danger>
                撤销
              </Button>
            </Popconfirm>
          ) : null}
          <Popconfirm
            title="确定删除此 Key？"
            description="删除后无法恢复"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <Card
        title="API Key 管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            生成 Key
          </Button>
        }
      >
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          API Key 可替代 JWT Token 进行接口认证，永久有效。请妥善保管，泄露后请立即撤销。
        </Paragraph>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 50 }}>
            <Spin size="large" />
          </div>
        ) : (
          <Table<BlogAPI.ApiKey>
            rowKey="id"
            columns={columns}
            dataSource={keys}
            pagination={false}
          />
        )}
      </Card>

      {/* 创建 Key 弹窗 */}
      <Modal
        title="生成 API Key"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          setNewKeyName('');
          setNewKeyResult(null);
        }}
        footer={
          newKeyResult
            ? [
                <Button
                  key="close"
                  type="primary"
                  onClick={() => {
                    setCreateModalOpen(false);
                    setNewKeyResult(null);
                  }}
                >
                  我已保存，关闭
                </Button>,
              ]
            : undefined
        }
        onOk={newKeyResult ? undefined : handleCreate}
        confirmLoading={creating}
        okText="生成"
        destroyOnClose
      >
        {newKeyResult ? (
          <div>
            <Paragraph type="warning" strong>
              请立即复制并保存此 Key，关闭后将无法再次查看。
            </Paragraph>
            <Input.TextArea
              value={newKeyResult}
              readOnly
              autoSize={{ minRows: 2 }}
              style={{ marginBottom: 12, fontFamily: 'monospace' }}
            />
            <Button
              icon={<CopyOutlined />}
              onClick={() => handleCopy(newKeyResult)}
              block
            >
              复制 Key
            </Button>
          </div>
        ) : (
          <div>
            <Paragraph type="secondary">
              为 Key 起一个名称，方便后续识别用途。
            </Paragraph>
            <Input
              placeholder="例如：博客前端调用、CI/CD 部署"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              maxLength={100}
              onPressEnter={handleCreate}
            />
          </div>
        )}
      </Modal>
    </PageContainer>
  );
};

export default ApiKeysPage;
