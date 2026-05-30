import {
  EyeOutlined,
  UserOutlined,
  RiseOutlined,
  WechatOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { App, Card, Col, Radio, Row, Spin, Statistic } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import {
  getAnalyticsOverview,
  getAnalyticsTimeSeries,
  getAnalyticsTopPages,
  getAnalyticsTopReferrers,
  getAnalyticsDevices,
  type AnalyticsPeriod,
} from '@/services/blog/analytics';
import TrafficTrend from './components/TrafficTrend';
import TopList from './components/TopList';
import DevicePie from './components/DevicePie';

const PERIOD_OPTIONS: { label: string; value: AnalyticsPeriod }[] = [
  { label: '今日', value: '24h' },
  { label: '7 天', value: '7d' },
  { label: '30 天', value: '30d' },
  { label: '90 天', value: '90d' },
];

const Dashboard: React.FC = () => {
  const { message } = App.useApp();
  const [period, setPeriod] = useState<AnalyticsPeriod>('7d');
  const [loading, setLoading] = useState(false);

  const [overview, setOverview] = useState<BlogAPI.AnalyticsOverview | null>(null);
  const [timeSeries, setTimeSeries] = useState<BlogAPI.AnalyticsTimePoint[]>([]);
  const [topPages, setTopPages] = useState<BlogAPI.AnalyticsTopPage[]>([]);
  const [referrers, setReferrers] = useState<BlogAPI.AnalyticsTopReferrer[]>([]);
  const [devices, setDevices] = useState<BlogAPI.AnalyticsDimension[]>([]);

  const loadData = useCallback(
    async (selected: AnalyticsPeriod) => {
      setLoading(true);
      try {
        const [ov, ts, tp, rf, dv] = await Promise.all([
          getAnalyticsOverview(selected),
          getAnalyticsTimeSeries(selected),
          getAnalyticsTopPages(selected),
          getAnalyticsTopReferrers(selected),
          getAnalyticsDevices(selected),
        ]);
        setOverview(ov);
        setTimeSeries(ts);
        setTopPages(tp);
        setReferrers(rf);
        setDevices(dv);
      } catch {
        message.error('加载统计数据失败');
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  useEffect(() => {
    loadData(period);
  }, [period, loadData]);

  return (
    <PageContainer
      extra={
        <Radio.Group
          options={PERIOD_OPTIONS}
          value={period}
          optionType="button"
          buttonStyle="solid"
          onChange={(e) => setPeriod(e.target.value)}
        />
      }
    >
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={12} lg={6}>
            <Card>
              <Statistic
                title="页面浏览量 (PV)"
                value={overview?.pageViews ?? 0}
                prefix={<EyeOutlined style={{ color: '#1677ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card>
              <Statistic
                title="独立访客 (UV)"
                value={overview?.visitors ?? 0}
                prefix={<UserOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card>
              <Statistic
                title="跳出率"
                value={overview?.bounceRate ?? 0}
                suffix="%"
                prefix={<RiseOutlined style={{ color: '#faad14' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card>
              <Statistic
                title="微信关注"
                value={overview?.wechatFollowers ?? 0}
                prefix={<WechatOutlined style={{ color: '#07c160' }} />}
              />
            </Card>
          </Col>
        </Row>

        <Card title="访问趋势" style={{ marginTop: 16 }}>
          <TrafficTrend data={timeSeries} />
        </Card>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <Card title="热门页面">
              <TopList
                data={topPages.map((p) => ({ name: p.page, views: p.views }))}
                emptyText="暂无页面访问数据"
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="流量来源">
              <TopList
                data={referrers.map((r) => ({ name: r.referrer, views: r.views }))}
                emptyText="暂无来源数据"
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <Card title="设备分布">
              <DevicePie
                data={devices.map((d) => ({ type: d.device ?? '未知', value: d.views }))}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </PageContainer>
  );
};

export default Dashboard;
