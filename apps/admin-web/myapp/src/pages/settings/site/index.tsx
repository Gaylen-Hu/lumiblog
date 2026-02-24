import { PageContainer, ProForm, ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import { App, Card, Divider, Space, Image, Button, Spin } from 'antd';
import React, { useState, useEffect } from 'react';
import { getSiteConfig, updateSiteConfig } from '@/services/blog/siteConfig';
import { MediaPicker } from '@/components/MediaPicker';

const SiteConfigPage: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState<BlogAPI.SiteConfig | null>(null);
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  const [faviconPickerOpen, setFaviconPickerOpen] = useState(false);
  const [formRef] = ProForm.useForm();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await getSiteConfig();
      setConfig(data);
      formRef.setFieldsValue(data);
    } catch {
      message.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: BlogAPI.UpdateSiteConfigParams) => {
    try {
      setSubmitting(true);
      await updateSiteConfig({
        ...values,
        logo: config?.logo,
        favicon: config?.favicon,
      });
      message.success('保存成功');
    } catch {
      message.error('保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <Card>
          <div style={{ textAlign: 'center', padding: 50 }}>
            <Spin size="large" />
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Card>
        <ProForm
          form={formRef}
          layout="vertical"
          onFinish={handleSubmit}
          submitter={{
            searchConfig: { submitText: '保存配置' },
            resetButtonProps: { style: { display: 'none' } },
            submitButtonProps: { loading: submitting },
          }}
        >
          <Divider orientation="left">基本信息</Divider>

          <ProFormText
            name="title"
            label="网站标题"
            placeholder="请输入网站标题"
            rules={[
              { required: true, message: '请输入网站标题' },
              { max: 60, message: '标题不能超过60个字符' },
            ]}
            fieldProps={{ showCount: true, maxLength: 60 }}
          />

          <ProFormTextArea
            name="description"
            label="网站描述"
            placeholder="请输入网站描述，用于 SEO"
            rules={[{ max: 200, message: '描述不能超过200个字符' }]}
            fieldProps={{ showCount: true, maxLength: 200, rows: 3 }}
          />

          <ProFormText
            name="keywords"
            label="关键词"
            placeholder="请输入关键词，多个用英文逗号分隔"
            tooltip="用于 SEO，多个关键词用英文逗号分隔"
            rules={[{ max: 200, message: '关键词不能超过200个字符' }]}
          />

          <Divider orientation="left">网站图标</Divider>

          <ProForm.Item label="网站 Logo">
            <Space direction="vertical">
              {config?.logo ? (
                <Image
                  src={config.logo}
                  alt="Logo"
                  width={200}
                  style={{ maxHeight: 80, objectFit: 'contain' }}
                />
              ) : (
                <div style={{ color: '#999' }}>暂未设置</div>
              )}
              <Button onClick={() => setLogoPickerOpen(true)}>选择图片</Button>
            </Space>
          </ProForm.Item>

          <ProForm.Item label="Favicon">
            <Space direction="vertical">
              {config?.favicon ? (
                <Image
                  src={config.favicon}
                  alt="Favicon"
                  width={32}
                  height={32}
                />
              ) : (
                <div style={{ color: '#999' }}>暂未设置</div>
              )}
              <Button onClick={() => setFaviconPickerOpen(true)}>选择图片</Button>
            </Space>
          </ProForm.Item>

          <Divider orientation="left">备案信息</Divider>

          <ProFormText
            name="icp"
            label="ICP 备案号"
            placeholder="例如：京ICP备12345678号"
          />

          <ProFormText
            name="gongan"
            label="公安备案号"
            placeholder="例如：京公网安备 11010102001234号"
          />

          <ProFormText
            name="copyright"
            label="版权信息"
            placeholder="例如：© 2024 NOVA. All rights reserved."
          />

          <Divider orientation="left">统计代码</Divider>

          <ProFormTextArea
            name="analytics"
            label="统计代码"
            placeholder="请输入第三方统计代码（如百度统计、Google Analytics）"
            fieldProps={{ rows: 4 }}
            tooltip="将在页面底部插入，支持 HTML/JavaScript"
          />
        </ProForm>
      </Card>

      <MediaPicker
        open={logoPickerOpen}
        onCancel={() => setLogoPickerOpen(false)}
        onSelect={(media) => {
          setConfig((prev) => (prev ? { ...prev, logo: media.url } : null));
          setLogoPickerOpen(false);
        }}
        accept="image/*"
      />

      <MediaPicker
        open={faviconPickerOpen}
        onCancel={() => setFaviconPickerOpen(false)}
        onSelect={(media) => {
          setConfig((prev) => (prev ? { ...prev, favicon: media.url } : null));
          setFaviconPickerOpen(false);
        }}
        accept="image/*"
      />
    </PageContainer>
  );
};

export default SiteConfigPage;
