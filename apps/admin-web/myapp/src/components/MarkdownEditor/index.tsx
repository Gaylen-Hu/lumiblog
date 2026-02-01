import { PictureOutlined } from '@ant-design/icons';
import { Modal } from 'antd';
import MDEditor, { commands, ICommand } from '@uiw/react-md-editor';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import MediaPicker from '@/components/MediaPicker';
import styles from './index.less';

export interface MarkdownEditorProps {
  /** 编辑器内容 */
  value?: string;
  /** 内容变化回调 */
  onChange?: (value: string) => void;
  /** 编辑器高度 */
  height?: number;
  /** 草稿存储 key，用于区分不同文章的草稿 */
  draftKey?: string;
  /** 自动保存间隔（毫秒），默认 30000 */
  autoSaveInterval?: number;
}

const DRAFT_PREFIX = 'md_editor_draft_';
const DEFAULT_AUTO_SAVE_INTERVAL = 30000;

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value = '',
  onChange,
  height = 500,
  draftKey = 'default',
  autoSaveInterval = DEFAULT_AUTO_SAVE_INTERVAL,
}) => {
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [editorValue, setEditorValue] = useState(value);
  const [draftChecked, setDraftChecked] = useState(false);
  const editorRef = useRef<typeof MDEditor>(null);
  const lastSavedRef = useRef<string>(value);

  const storageKey = `${DRAFT_PREFIX}${draftKey}`;

  // 检查并提示恢复草稿
  useEffect(() => {
    if (draftChecked) return;

    try {
      const savedDraft = localStorage.getItem(storageKey);
      if (savedDraft && savedDraft !== value) {
        Modal.confirm({
          title: '发现未保存的草稿',
          content: '检测到有未保存的草稿内容，是否恢复？',
          okText: '恢复草稿',
          cancelText: '忽略',
          onOk: () => {
            setEditorValue(savedDraft);
            onChange?.(savedDraft);
          },
          onCancel: () => {
            // 清除旧草稿
            localStorage.removeItem(storageKey);
          },
        });
      }
    } catch {
      // Draft restore fails - silently ignore
      console.warn('Failed to restore draft from localStorage');
    }

    setDraftChecked(true);
  }, [draftChecked, storageKey, value, onChange]);

  // 同步外部 value 变化
  useEffect(() => {
    if (draftChecked) {
      setEditorValue(value);
    }
  }, [value, draftChecked]);

  // 自动保存草稿到 localStorage
  useEffect(() => {
    const timer = setInterval(() => {
      try {
        // 只有内容变化时才保存
        if (editorValue !== lastSavedRef.current && editorValue.trim()) {
          localStorage.setItem(storageKey, editorValue);
          lastSavedRef.current = editorValue;
        }
      } catch {
        // Auto-save fails - log to console, do not interrupt user
        console.warn('Failed to auto-save draft to localStorage');
      }
    }, autoSaveInterval);

    return () => clearInterval(timer);
  }, [editorValue, storageKey, autoSaveInterval]);

  // 处理编辑器内容变化
  const handleChange = useCallback(
    (val?: string) => {
      const newValue = val || '';
      setEditorValue(newValue);
      onChange?.(newValue);
    },
    [onChange],
  );

  // 处理图片选择
  const handleMediaSelect = useCallback(
    (media: BlogAPI.Media) => {
      // 插入 Markdown 图片语法
      const imageMarkdown = `![${media.alt || media.originalName}](${media.url})`;
      const newValue = editorValue ? `${editorValue}\n${imageMarkdown}` : imageMarkdown;
      setEditorValue(newValue);
      onChange?.(newValue);
      setMediaPickerOpen(false);
    },
    [editorValue, onChange],
  );

  // 清除草稿（供外部调用，如保存成功后）
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      lastSavedRef.current = editorValue;
    } catch {
      console.warn('Failed to clear draft from localStorage');
    }
  }, [storageKey, editorValue]);

  // 将 clearDraft 方法暴露给父组件
  useEffect(() => {
    // 通过 window 事件暴露清除草稿方法
    const handleClearDraft = (e: CustomEvent<{ draftKey: string }>) => {
      if (e.detail.draftKey === draftKey) {
        clearDraft();
      }
    };
    window.addEventListener('clearMarkdownDraft' as any, handleClearDraft);
    return () => {
      window.removeEventListener('clearMarkdownDraft' as any, handleClearDraft);
    };
  }, [draftKey, clearDraft]);

  // 自定义图片插入命令
  const imageCommand: ICommand = {
    name: 'image',
    keyCommand: 'image',
    buttonProps: { 'aria-label': '插入图片' },
    icon: (
      <span title="插入图片">
        <PictureOutlined style={{ fontSize: 14 }} />
      </span>
    ),
    execute: () => {
      setMediaPickerOpen(true);
    },
  };

  // 自定义工具栏命令列表
  const customCommands = [
    commands.bold,
    commands.italic,
    commands.strikethrough,
    commands.hr,
    commands.divider,
    commands.title1,
    commands.title2,
    commands.title3,
    commands.divider,
    commands.link,
    imageCommand,
    commands.quote,
    commands.code,
    commands.codeBlock,
    commands.divider,
    commands.unorderedListCommand,
    commands.orderedListCommand,
    commands.checkedListCommand,
  ];

  return (
    <div className={styles.markdownEditor} data-color-mode="light">
      <MDEditor
        ref={editorRef}
        value={editorValue}
        onChange={handleChange}
        height={height}
        commands={customCommands}
        preview="live"
        visibleDragbar={false}
      />
      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
        mediaType="image"
      />
    </div>
  );
};

// 工具函数：清除指定 draftKey 的草稿
export const clearMarkdownDraft = (draftKey: string): void => {
  window.dispatchEvent(
    new CustomEvent('clearMarkdownDraft', { detail: { draftKey } }),
  );
};

export default MarkdownEditor;
