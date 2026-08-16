import { PlusOutlined } from '@ant-design/icons';
import { ActionType, ModalForm, PageContainer, ProColumns, ProFormText, ProFormTextArea, ProTable } from '@ant-design/pro-components';
import { App, Button, Drawer, Popconfirm, Space, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import { checkFriendLink, createFriendLink, getFriendLinkChecks, getFriendLinks, removeFriendLink, restoreFriendLink, reviewFriendLink, updateFriendLink } from '@/services/blog/friendLink';

const labels: Record<BlogAPI.FriendLinkStatus, [string, string]> = { PENDING: ['待审核', 'gold'], APPROVED: ['已上线', 'green'], REJECTED: ['已拒绝', 'red'], REMOVED: ['已移除', 'default'] };
const FriendLinks: React.FC = () => {
  const actionRef = useRef<ActionType>(); const { message } = App.useApp(); const [open, setOpen] = useState(false); const [editing, setEditing] = useState<BlogAPI.FriendLink>(); const [history, setHistory] = useState<BlogAPI.FriendLinkCheck[]>([]); const [drawer, setDrawer] = useState(false);
  const reload = () => actionRef.current?.reload();
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); message.success(ok); reload(); } catch { message.error('操作失败，请稍后重试'); } };
  const columns: ProColumns<BlogAPI.FriendLink>[] = [
    { title: '网站', dataIndex: 'siteName', render: (_, r) => <a href={r.siteUrl} target="_blank" rel="noreferrer">{r.siteName}</a> },
    { title: '描述', dataIndex: 'description', ellipsis: true, search: false },
    { title: '状态', dataIndex: 'status', valueType: 'select', valueEnum: Object.fromEntries(Object.entries(labels).map(([k, [text]]) => [k, { text }])), render: (_, r) => <Tag color={labels[r.status][1]}>{labels[r.status][0]}</Tag> },
    { title: '最近核验', search: false, render: (_, r) => r.lastCheckedAt ? <Tag color={r.lastCheckPassed ? 'green' : 'red'}>{r.lastCheckPassed ? '通过' : '未通过'}</Tag> : '-' },
    { title: '操作', valueType: 'option', width: 270, render: (_, r) => <Space wrap><a onClick={() => { setEditing(r); setOpen(true); }}>编辑</a>{r.status === 'PENDING' && <><a onClick={() => run(() => reviewFriendLink(r.id, 'approve'), '已通过，7 天后开始定期核验')}>通过</a><a onClick={() => run(() => reviewFriendLink(r.id, 'reject'), '已拒绝')}>拒绝</a></>}{r.status === 'REMOVED' && <a onClick={() => run(() => restoreFriendLink(r.id), '已恢复至待审核')}>恢复</a>}<a onClick={async () => { try { setHistory(await getFriendLinkChecks(r.id)); setDrawer(true); } catch { message.error('无法获取记录'); } }}>记录</a><a onClick={() => run(() => checkFriendLink(r.id), '核验完成')}>核验</a><Popconfirm title="确认移除？可在已移除中恢复。" onConfirm={() => run(() => removeFriendLink(r.id), '已移除')}><a style={{ color: '#ff4d4f' }}>移除</a></Popconfirm></Space> },
  ];
  const fields = <><ProFormText name="siteName" label="网站名称" rules={[{ required: true }]} /><ProFormText name="siteUrl" label="网站地址" rules={[{ required: true, type: 'url' }]} /><ProFormText name="reciprocalUrl" label="本站链接所在页面" rules={[{ required: true, type: 'url' }]} /><ProFormText name="contactEmail" label="联系邮箱" rules={[{ type: 'email' }]} /><ProFormTextArea name="description" label="简介" rules={[{ required: true }]} /></>;
  return <PageContainer><ProTable<BlogAPI.FriendLink> headerTitle="友链管理" actionRef={actionRef} rowKey="id" toolBarRender={() => [<Button key="new" type="primary" onClick={() => { setEditing(undefined); setOpen(true); }}><PlusOutlined />新增友链</Button>]} request={async (p) => ({ data: await getFriendLinks({ status: p.status }), success: true })} columns={columns} search={{ labelWidth: 'auto' }} />
    <ModalForm title={editing ? '编辑友链' : '新增友链'} open={open} onOpenChange={setOpen} initialValues={editing} modalProps={{ destroyOnClose: true }} onFinish={async (values) => { try { editing ? await updateFriendLink(editing.id, values) : await createFriendLink(values as BlogAPI.FriendLinkInput); message.success('已保存'); setOpen(false); reload(); return true; } catch { message.error('保存失败'); return false; } }}>{fields}</ModalForm>
    <Drawer title="核验记录" open={drawer} onClose={() => setDrawer(false)}>{history.map((item) => <div key={item.id} style={{ marginBottom: 16 }}><Tag color={item.passed ? 'green' : 'red'}>{item.passed ? '通过' : '未通过'}</Tag><div>{item.checkedAt}</div><div>{item.message}</div></div>)}</Drawer>
  </PageContainer>;
}; export default FriendLinks;
