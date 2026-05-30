import { Empty, Progress } from 'antd';
import React from 'react';

interface TopListItem {
  name: string;
  views: number;
}

interface TopListProps {
  data: TopListItem[];
  emptyText: string;
}

/** 排行榜列表：带占比进度条 */
const TopList: React.FC<TopListProps> = ({ data, emptyText }) => {
  if (data.length === 0) {
    return <Empty description={emptyText} />;
  }

  const max = data.reduce((m, item) => (item.views > m ? item.views : m), 0);

  return (
    <div>
      {data.map((item) => (
        <div key={item.name} style={{ marginBottom: 12 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 4,
              fontSize: 13,
            }}
          >
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '80%',
              }}
              title={item.name}
            >
              {item.name}
            </span>
            <span style={{ color: '#888', flexShrink: 0 }}>{item.views}</span>
          </div>
          <Progress
            percent={max > 0 ? Math.round((item.views / max) * 100) : 0}
            showInfo={false}
            strokeColor="#1677ff"
            size="small"
          />
        </div>
      ))}
    </div>
  );
};

export default TopList;
