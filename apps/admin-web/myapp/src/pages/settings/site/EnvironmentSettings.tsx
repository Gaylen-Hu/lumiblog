import { request } from '@umijs/max';
import { App, Button, Card, Form, Input, InputNumber, Select, Alert } from 'antd';
import React, { useEffect, useState } from 'react';

type Config = { city: string; timezone: string; latitude: number; longitude: number; preset: string; revision: number };
export default function EnvironmentSettings() {
  const { message } = App.useApp();
  const [form] = Form.useForm<Config>();
  const [available, setAvailable] = useState(false), [busy, setBusy] = useState(false);
  useEffect(() => { let disposed = false; request<Config>('/api/environment-config', { skipErrorHandler: true }).then(value => { if (!disposed) { form.setFieldsValue(value); setAvailable(true); } }).catch(() => {}); return () => { disposed = true; }; }, [form]);
  return <Card title="书房窗景" style={{ marginTop: 24 }}>
    <Alert type="info" showIcon message="环境配置独立保存，仅管理员可修改。天气凭据由部署环境配置；季节与雨声当前为原型。" />
    {!available ? <p>环境接口暂不可用或当前账号不是管理员。请检查后端版本及数据库迁移。</p> : <Form form={form} layout="vertical" onFinish={async values => {
      setBusy(true);
      try { const saved = await request<Config>('/api/environment-config', { method: 'PATCH', data: values }); form.setFieldsValue(saved); message.success('环境配置已保存'); } catch { message.error('保存失败，请检查权限与配置'); } finally { setBusy(false); }
    }}>
      <Form.Item name="city" label="城市" rules={[{ required: true, max: 80 }]}><Input /></Form.Item>
      <Form.Item name="timezone" label="IANA 时区" rules={[{ required: true }]}><Input placeholder="Asia/Shanghai" /></Form.Item>
      <Form.Item name="latitude" label="纬度" rules={[{ required: true }]}><InputNumber min={-90} max={90} /></Form.Item>
      <Form.Item name="longitude" label="经度" rules={[{ required: true }]}><InputNumber min={-180} max={180} /></Form.Item>
      <Form.Item name="preset" label="站点默认环境" rules={[{ required: true }]}><Select options={[['auto','自动天气'],['sunny','晴朗午后'],['rainy-night','安静雨夜'],['spring','春日清晨'],['autumn','秋日黄昏'],['snow','冬日飘雪（原型）']].map(([value,label]) => ({ value,label }))} /></Form.Item>
      <Button htmlType="submit" type="primary" loading={busy}>保存环境配置</Button>
    </Form>}
  </Card>;
}
