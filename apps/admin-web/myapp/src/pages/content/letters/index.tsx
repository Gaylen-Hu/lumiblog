import { PageContainer } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import {
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useState } from 'react';

const endpoint = '/api/admin/letters';
const labels = {
  private: '私信',
  pending: '待审核',
  published: '已公开',
  declined: '未采用',
  withdrawn: '已撤回',
  unread: '未读',
  handled: '已处理',
};
type Filter = keyof typeof labels;
type Letter = {
  id: string;
  nickname: string;
  topic: string;
  status: Filter;
  allowPublic: boolean;
  createdAt: string;
  handledAt: string | null;
  readAt: string | null;
};
type Detail = Letter & {
  email: string;
  phone: string;
  body: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
};
type Search = { filter?: Filter; email?: string; before?: string };
const stamp = (value: string) => new Date(value).toLocaleString('zh-CN');

export default function Letters() {
  const [search, setSearch] = useState<Search>({});
  const [page, setPage] = useState<Letter[]>([]);
  const [history, setHistory] = useState<Search[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [revision, refresh] = useState(0);
  const [id, select] = useState<string>();
  const [detail, setDetail] = useState<Detail>();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    request<Letter[]>(endpoint + '/search', { method: 'POST', data: search })
      .then((rows) => {
        if (active) setPage(rows);
      })
      .catch(() => {
        if (active) {
          setPage([]);
          setFailed(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [search, revision]);
  useEffect(() => {
    let active = true;
    setDetail(undefined);
    if (id)
      request<Detail>(endpoint + '/' + id)
        .then((row) => {
          if (active) setDetail(row);
        })
        .catch(() => {
          if (active) {
            select(undefined);
            message.error('取信失败，请重新打开。');
          }
        });
    return () => {
      active = false;
    };
  }, [id, revision]);
  async function action(verb: string) {
    if (!id || saving) return;
    setSaving(true);
    try {
      await request(
        endpoint + '/' + id,
        verb === 'delete'
          ? { method: 'DELETE' }
          : { method: 'PATCH', data: { action: verb } },
      );
      if (verb === 'delete') {
        setDetail(undefined);
        select(undefined);
      }
      refresh((n) => n + 1);
      message.success('已保存');
    } catch {
      message.error('操作未确认，请刷新收件箱。');
    } finally {
      setSaving(false);
    }
  }
  const options = Object.entries(labels).map(([value, label]) => ({
    value,
    label,
  }));
  const canPublish = detail?.status === 'pending' && detail.allowPublic;
  return (
    <PageContainer title="书房来信">
      <Form
        layout="inline"
        onFinish={(values: Search) => {
          setSearch({
            filter: values.filter,
            email: values.email?.trim() || undefined,
          });
          setHistory([]);
        }}
      >
        <Form.Item name="filter" label="状态">
          <Select
            allowClear
            placeholder="全部"
            style={{ width: 130 }}
            options={options}
          />
        </Form.Item>
        <Form.Item name="email" label="自填邮箱" rules={[{ type: 'email' }]}>
          <Input type="email" allowClear />
        </Form.Item>
        <Button htmlType="submit">查找</Button>
      </Form>
      {failed && (
        <Alert
          type="error"
          message="收件箱读取失败"
          action={<Button onClick={() => refresh((n) => n + 1)}>重试</Button>}
        />
      )}
      <Table<Letter>
        loading={loading}
        rowKey="id"
        dataSource={page}
        pagination={false}
        columns={[
          {
            title: '落款',
            dataIndex: 'nickname',
            render: (name: string, row) => (
              <Button type="link" onClick={() => select(row.id)}>
                {name}
              </Button>
            ),
          },
          {
            title: '状态',
            render: (_, row) => (
              <Space>
                <Tag>{labels[row.status]}</Tag>
                {!row.readAt && '未读'}
                {row.handledAt && '已处理'}
                {row.handledAt &&
                  row.status !== 'published' &&
                  Date.now() - Date.parse(row.handledAt) > 90 * 86400000 && (
                    <Tag color="orange">保留已满 90 天，请复核</Tag>
                  )}
              </Space>
            ),
          },
          { title: '寄达', dataIndex: 'createdAt', render: stamp },
        ]}
      />
      <Space>
        <Button
          disabled={!history.length || loading}
          onClick={() => {
            setSearch(history[history.length - 1]);
            setHistory(history.slice(0, -1));
          }}
        >
          上一页
        </Button>
        <Button
          disabled={page.length < 40 || loading}
          onClick={() => {
            setHistory([...history, search]);
            setSearch({ ...search, before: page[page.length - 1].id });
          }}
        >
          下一页
        </Button>
      </Space>
      <Drawer
        title="来信详情"
        width={540}
        open={!!id}
        onClose={() => select(undefined)}
      >
        {id && detail?.id === id && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Title level={4}>{detail.nickname}</Typography.Title>
            <span>
              {stamp(detail.createdAt)} · {labels[detail.status]} ·{' '}
              {
                (
                  {
                    general: '一般交流',
                    work: '项目合作',
                    other: '其他',
                  } as Record<string, string>
                )[detail.topic]
              }
            </span>
            <div>
              自填邮箱　{detail.email}
              <br />
              手机号　{detail.phone || '未填写'}
            </div>
            <section>
              <strong>
                {canPublish || detail.status === 'published'
                  ? '公开展示预览'
                  : '信件正文'}
              </strong>
              <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                {detail.body}
              </p>
              <small>—— {detail.nickname}</small>
            </section>
            {canPublish &&
              /@|1[3-9]\d{9}|微信|weixin/i.test(
                detail.body + ' ' + detail.nickname,
              ) && (
                <Alert
                  type="warning"
                  message="可能包含联系方式，请复核后决定是否保留私密。"
                />
              )}
            {detail.reviewedAt && (
              <small>
                审核于 {stamp(detail.reviewedAt)} · {detail.reviewedBy}
              </small>
            )}
            <Space wrap>
              {!detail.readAt && (
                <Button disabled={saving} onClick={() => action('read')}>
                  标为已读
                </Button>
              )}
              {!detail.handledAt && (
                <Button disabled={saving} onClick={() => action('handled')}>
                  标为已处理
                </Button>
              )}
              {canPublish && (
                <>
                  <Popconfirm
                    title="公开以上昵称和正文？"
                    onConfirm={() => action('publish')}
                  >
                    <Button disabled={saving}>审核通过并公开</Button>
                  </Popconfirm>
                  <Button disabled={saving} onClick={() => action('decline')}>
                    保留私密
                  </Button>
                </>
              )}
              {detail.status === 'published' && (
                <Button disabled={saving} onClick={() => action('withdraw')}>
                  撤回公开
                </Button>
              )}
              <Popconfirm
                title="永久删除正文和联系方式？"
                description="此操作无法在收件箱撤销。"
                onConfirm={() => action('delete')}
              >
                <Button danger disabled={saving}>
                  删除
                </Button>
              </Popconfirm>
            </Space>
          </Space>
        )}
      </Drawer>
    </PageContainer>
  );
}
