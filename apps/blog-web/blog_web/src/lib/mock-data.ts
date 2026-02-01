import type { Post, Project, MicroPost, TechStack } from '@/types';

// TODO: 后端需要实现文章列表接口，目前使用 mock 数据
export const MOCK_POSTS: Post[] = [
  {
    id: '1',
    slug: 'future-of-neural-interfaces',
    title: '神经接口的未来',
    excerpt: '脑机连接如何从科幻小说演变为日常医疗现实。',
    content: `生物与硅的交汇不再局限于科幻小说的领域。神经蕾丝技术和微电极阵列的最新突破正在为未来铺平道路。

### 非侵入式系统的崛起

虽然像 Neuralink 这样的公司专注于手术植入物，但新一波初创公司正在探索高保真 EEG 和 fNIRS 帽。

### 伦理与主权

随着我们与 AI 驱动的接口更深入地整合，认知自由的问题变得至关重要。`,
    author: 'Elena Vance',
    date: '2024年10月12日',
    readTime: '6 分钟',
    category: '神经科学',
    imageUrl: 'https://picsum.photos/seed/neuro/1200/600',
    tags: ['技术', '未来', '医疗'],
  },
  {
    id: '2',
    slug: 'minimalism-in-spatial-computing',
    title: '空间计算时代的极简主义',
    excerpt: '当我们从平面屏幕过渡到沉浸式 3D 环境时，重新定义用户界面设计。',
    content: `空间计算需要对视觉层次进行彻底的重新思考。

### 隐形 UI

最好的界面是你看不到的界面。在 AR 和 VR 中，我们利用深度、光线和声音来引导用户。`,
    author: 'Marcus Aurelius',
    date: '2024年9月28日',
    readTime: '8 分钟',
    category: '设计',
    imageUrl: 'https://picsum.photos/seed/spatial/1200/600',
    tags: ['UX', 'AR/VR', 'Apple'],
  },
  {
    id: '3',
    slug: 'sustainable-energy-solid-state',
    title: '可持续能源：固态革命',
    excerpt: '为什么固态电池是完全绿色交通基础设施的缺失环节。',
    content: `锂离子电池为我们服务得很好，但它已经达到了物理极限。

### 突破 1000 公里障碍

主要汽车制造商正在竞相商业化可以让电动汽车续航超过 1000 公里的电池。`,
    author: 'Sarah Chen',
    date: '2024年8月15日',
    readTime: '5 分钟',
    category: '可持续发展',
    imageUrl: 'https://picsum.photos/seed/energy/1200/600',
    tags: ['能源', '气候', '创新'],
  },
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1',
    title: 'Lumina Dashboard',
    description: '为高增长初创公司打造的数据可视化平台，专注于清晰度和速度。',
    techStack: ['React', 'D3.js', 'Tailwind'],
    imageUrl: 'https://picsum.photos/800/600?random=1',
    link: '#',
  },
  {
    id: 'p2',
    title: 'Zenith OS',
    description: '一个实验性的基于浏览器的操作系统，专为生产力而构建。',
    techStack: ['TypeScript', 'Vite', 'Three.js'],
    imageUrl: 'https://picsum.photos/800/600?random=2',
    link: '#',
  },
  {
    id: 'p3',
    title: 'Ether Audio',
    description: '为协作音乐制作设计的空间音频编辑工具。',
    techStack: ['WebAudio API', 'Rust', 'WASM'],
    imageUrl: 'https://picsum.photos/800/600?random=3',
    link: '#',
  },
];


export function getPostBySlug(slug: string): Post | undefined {
  return MOCK_POSTS.find((post) => post.slug === slug);
}

export function getAllPosts(): Post[] {
  return MOCK_POSTS;
}
