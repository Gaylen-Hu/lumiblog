import { PageContainer, ProForm, ProFormText, ProFormTextArea, ProFormDigit } from '@ant-design/pro-components';
import { App, Card, Divider, Space, Image, Button, Spin, Select, Form } from 'antd';
import React, { useState, useEffect } from 'react';
import { getSiteConfig, updateSiteConfig } from '@/services/blog/siteConfig';
import MediaPicker from '@/components/MediaPicker';

const SiteConfigPage: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState<BlogAPI.SiteConfig | null>(null);
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  const [faviconPickerOpen, setFaviconPickerOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [aboutImage1PickerOpen, setAboutImage1PickerOpen] = useState(false);
  const [aboutImage2PickerOpen, setAboutImage2PickerOpen] = useState(false);
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
        logo: config?.logo ?? undefined,
        favicon: config?.favicon ?? undefined,
        ownerAvatar: config?.ownerAvatar ?? undefined,
        aboutImage1: config?.aboutImage1 ?? undefined,
        aboutImage2: config?.aboutImage2 ?? undefined,
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

          <Divider orientation="left">站长信息</Divider>

          <ProFormText
            name="ownerName"
            label="站长名称"
            placeholder="请输入站长名称"
            rules={[{ max: 50, message: '名称不能超过50个字符' }]}
          />

          <ProFormText
            name="ownerEmail"
            label="站长邮箱"
            placeholder="请输入站长邮箱"
          />

          <ProFormTextArea
            name="ownerBio"
            label="站长简介"
            placeholder="请输入站长简介"
            rules={[{ max: 500, message: '简介不能超过500个字符' }]}
            fieldProps={{ showCount: true, maxLength: 500, rows: 3 }}
          />

          <ProForm.Item label="站长头像">
            <Space direction="vertical">
              {config?.ownerAvatar ? (
                <Image
                  src={config.ownerAvatar}
                  alt="Avatar"
                  width={80}
                  height={80}
                  style={{ borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ color: '#999' }}>暂未设置</div>
              )}
              <Button onClick={() => setAvatarPickerOpen(true)}>选择图片</Button>
            </Space>
          </ProForm.Item>

          <Divider orientation="left">About 页面图片</Divider>

          <ProForm.Item label="About 图片1（左上）">
            <Space direction="vertical">
              {config?.aboutImage1 ? (
                <Image
                  src={config.aboutImage1}
                  alt="About Image 1"
                  width={80}
                  height={80}
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div style={{ color: '#999' }}>暂未设置</div>
              )}
              <Button onClick={() => setAboutImage1PickerOpen(true)}>选择图片</Button>
            </Space>
          </ProForm.Item>

          <ProForm.Item label="About 图片2（右下）">
            <Space direction="vertical">
              {config?.aboutImage2 ? (
                <Image
                  src={config.aboutImage2}
                  alt="About Image 2"
                  width={80}
                  height={80}
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div style={{ color: '#999' }}>暂未设置</div>
              )}
              <Button onClick={() => setAboutImage2PickerOpen(true)}>选择图片</Button>
            </Space>
          </ProForm.Item>

          <Divider orientation="left">技术栈 & 统计数据</Divider>

          <Form.Item
            name="ownerTechStack"
            label="技术栈"
            tooltip="显示在 About 页面，按回车添加"
          >
            <Select
              mode="tags"
              placeholder="输入技术名称后按回车添加，如 React、TypeScript"
              tokenSeparators={[',']}
            />
          </Form.Item>

          <ProFormDigit
            name="yearsOfExperience"
            label="项目经验年数"
            placeholder="请输入"
            min={0}
            max={99}
            fieldProps={{ precision: 0 }}
          />

          <ProFormDigit
            name="openSourceCount"
            label="开源贡献数"
            placeholder="请输入"
            min={0}
            fieldProps={{ precision: 0 }}
          />

          <ProFormDigit
            name="talkCount"
            label="技术分享数"
            placeholder="请输入"
            min={0}
            fieldProps={{ precision: 0 }}
          />

          <Divider orientation="left">社交链接</Divider>

          <ProFormText
            name="socialGithub"
            label="GitHub"
            placeholder="请输入 GitHub 主页链接"
          />

          <ProFormText
            name="socialTwitter"
            label="Twitter"
            placeholder="请输入 Twitter 主页链接"
          />

          <ProFormText
            name="socialLinkedin"
            label="LinkedIn"
            placeholder="请输入 LinkedIn 主页链接"
          />

          <ProFormText
            name="socialWeibo"
            label="微博"
            placeholder="请输入微博主页链接"
          />

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

          <ProFormText
            name="analyticsGoogle"
            label="Google Analytics"
            placeholder="请输入 Measurement ID，如 G-XXXXXXXXXX"
            tooltip="填写 Google Analytics 4 的 Measurement ID，格式为 G-XXXXXXXXXX"
          />

          <ProFormText
            name="analyticsBaidu"
            label="百度统计"
            placeholder="请输入百度统计 site key（32位字符串）"
            tooltip="在百度统计后台「代码获取」中找到 hm.js?后面的字符串"
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

      <MediaPicker
        open={avatarPickerOpen}
        onCancel={() => setAvatarPickerOpen(false)}
        onSelect={(media) => {
          setConfig((prev) => (prev ? { ...prev, ownerAvatar: media.url } : null));
          setAvatarPickerOpen(false);
        }}
        accept="image/*"
      />

      <MediaPicker
        open={aboutImage1PickerOpen}
        onCancel={() => setAboutImage1PickerOpen(false)}
        onSelect={(media) => {
          setConfig((prev) => (prev ? { ...prev, aboutImage1: media.url } : null));
          setAboutImage1PickerOpen(false);
        }}
        accept="image/*"
      />

      <MediaPicker
        open={aboutImage2PickerOpen}
        onCancel={() => setAboutImage2PickerOpen(false)}
        onSelect={(media) => {
          setConfig((prev) => (prev ? { ...prev, aboutImage2: media.url } : null));
          setAboutImage2PickerOpen(false);
        }}
        accept="image/*"
      />
    </PageContainer>
  );
};

export default SiteConfigPage;
