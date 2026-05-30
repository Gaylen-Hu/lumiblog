import { Line } from '@ant-design/plots';
import { Empty } from 'antd';
import React from 'react';

interface TrafficTrendProps {
  data: BlogAPI.AnalyticsTimePoint[];
}

/** 访问趋势双折线图：PV / UV */
const TrafficTrend: React.FC<TrafficTrendProps> = ({ data }) => {
  if (data.length === 0) {
    return <Empty description="暂无访问数据" />;
  }

  // 将 PV / UV 展开为长表格式，供分组折线使用
  const chartData = data.flatMap((point) => {
    const day = point.date.length > 10 ? point.date.slice(0, 10) : point.date;
    return [
      { date: day, type: '浏览量', value: point.pageViews },
      { date: day, type: '访客数', value: point.visitors },
    ];
  });

  const config = {
    data: chartData,
    xField: 'date',
    yField: 'value',
    colorField: 'type',
    height: 300,
    smooth: true,
    legend: { position: 'top' as const },
    axis: {
      y: { title: false },
      x: { title: false },
    },
    scale: { color: { range: ['#1677ff', '#52c41a'] } },
  };

  return <Line {...config} />;
};

export default TrafficTrend;
