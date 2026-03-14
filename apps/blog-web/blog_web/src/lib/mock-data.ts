import type { Post, Project } from '@/types';

// Fallback data used by api.ts when the backend is unavailable (build time / dev)
export const MOCK_POSTS: Post[] = [
  {
    id: '1',
    slug: 'future-of-neural-interfaces',
    title: '神经接口的未来',
    excerpt: '脑机连接如何从科幻小说演变为日常医疗现实。',
    coverImage: 'https://picsum.photos/seed/neuro/1200/600',
    author: { name: 'Elena Vance', avatar: null },
    publishedAt: '2024-10-12',
    readTime: '6 分钟',
    category: { id: 'c1', name: '神经科学', slug: 'neuroscience' },
    tags: [
      { id: 't1', name: '技术', slug: 'tech' },
      { id: 't2', name: '未来', slug: 'future' },
      { id: 't3', name: '医疗', slug: 'medical' },
    ],
  },
  {
    id: '2',
    slug: 'minimalism-in-spatial-computing',
    title: '空间计算时代的极简主义',
    excerpt: '当我们从平面屏幕过渡到沉浸式 3D 环境时，重新定义用户界面设计。',
    coverImage: 'https://picsum.photos/seed/spatial/1200/600',
    author: { name: 'Marcus Aurelius', avatar: null },
    publishedAt: '2024-09-28',
    readTime: '8 分钟',
    category: { id: 'c2', name: '设计', slug: 'design' },
    tags: [
      { id: 't4', name: 'UX', slug: 'ux' },
      { id: 't5', name: 'AR/VR', slug: 'ar-vr' },
      { id: 't6', name: 'Apple', slug: 'apple' },
    ],
  },
  {
    id: '3',
    slug: 'sustainable-energy-solid-state',
    title: '可持续能源：固态革命',
    excerpt: '为什么固态电池是完全绿色交通基础设施的缺失环节。',
    coverImage: 'https://picsum.photos/seed/energy/1200/600',
    author: { name: 'Sarah Chen', avatar: null },
    publishedAt: '2024-08-15',
    readTime: '5 分钟',
    category: { id: 'c3', name: '可持续发展', slug: 'sustainability' },
    tags: [
      { id: 't7', name: '能源', slug: 'energy' },
      { id: 't8', name: '气候', slug: 'climate' },
      { id: 't9', name: '创新', slug: 'innovation' },
    ],
  },
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1',
    title: 'Lumina Dashboard',
    description: '为高增长初创公司打造的数据可视化平台，专注于清晰度和速度。',
    techStack: ['React', 'D3.js', 'Tailwind'],
    coverImage: 'https://picsum.photos/800/600?random=1',
    link: '#',
    githubUrl: null,
    featured: true,
  },
  {
    id: 'p2',
    title: 'Zenith OS',
    description: '一个实验性的基于浏览器的操作系统，专为生产力而构建。',
    techStack: ['TypeScript', 'Vite', 'Three.js'],
    coverImage: 'https://picsum.photos/800/600?random=2',
    link: '#',
    githubUrl: null,
    featured: true,
  },
  {
    id: 'p3',
    title: 'Ether Audio',
    description: '为协作音乐制作设计的空间音频编辑工具。',
    techStack: ['WebAudio API', 'Rust', 'WASM'],
    coverImage: 'https://picsum.photos/800/600?random=3',
    link: '#',
    githubUrl: null,
    featured: true,
  },
];
