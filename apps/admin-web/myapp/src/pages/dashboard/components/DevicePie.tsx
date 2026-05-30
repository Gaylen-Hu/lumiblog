import { Pie } from '@ant-design/plots';
import { Empty } from 'antd';
import React from 'react';

interface DevicePieItem {
  type: string;
  value: number;
}

interface DevicePieProps {
  data: DevicePieItem[];
}

/** 设备分布环形图 */
const DevicePie: React.FC<DevicePieProps> = ({ data }) => {
  if (data.length === 0) {
    return <Empty description="暂无设备数据" />;
  }

  const config = {
    data,
    angleField: 'value',
    colorField: 'type',
    innerRadius: 0.6,
    height: 300,
    label: {
      text: 'value',
      style: { fontWeight: 'bold' },
    },
    legend: { color: { position: 'bottom' as const } },
  };

  return <Pie {...config} />;
};

export default DevicePie;
