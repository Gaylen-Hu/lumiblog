import { DeleteOutlined, HolderOutlined } from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Empty, List, Tag } from 'antd';
import React from 'react';

interface SortableArticleListProps {
  articles: BlogAPI.ColumnArticleItem[];
  onReorder: (articles: BlogAPI.ColumnArticleItem[]) => void;
  onRemove: (articleId: string) => void;
}

const SortableItem: React.FC<{
  article: BlogAPI.ColumnArticleItem;
  onRemove: (id: string) => void;
}> = ({ article, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: article.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? '#fafafa' : undefined,
  };

  return (
    <List.Item
      ref={setNodeRef}
      style={style}
      actions={[
        <Button
          key="remove"
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => onRemove(article.id)}
        >
          移除
        </Button>,
      ]}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
        <HolderOutlined
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', color: '#999', fontSize: 16 }}
        />
        <span style={{ flex: 1 }}>{article.title}</span>
        <span style={{ color: '#999', fontSize: 12 }}>{article.slug}</span>
        {article.isPublished ? (
          <Tag color="success">已发布</Tag>
        ) : (
          <Tag color="default">草稿</Tag>
        )}
      </div>
    </List.Item>
  );
};

const SortableArticleList: React.FC<SortableArticleListProps> = ({
  articles,
  onReorder,
  onRemove,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = articles.findIndex((a) => a.id === active.id);
    const newIndex = articles.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newArticles = [...articles];
    const [moved] = newArticles.splice(oldIndex, 1);
    newArticles.splice(newIndex, 0, moved);
    onReorder(newArticles);
  };

  if (articles.length === 0) {
    return <Empty description="暂无文章，点击下方按钮添加" />;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={articles.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <List
          bordered
          dataSource={articles}
          renderItem={(article) => (
            <SortableItem key={article.id} article={article} onRemove={onRemove} />
          )}
        />
      </SortableContext>
    </DndContext>
  );
};

export default SortableArticleList;
