import type { Post } from '@/types';

// TODO: 后端需要实现文章列表接口，目前使用 mock 数据
export const MOCK_POSTS: Post[] = [
  {
    id: '1',
    slug: 'future-of-neural-interfaces',
    title: '神经接口的未来',
    excerpt: '脑机连接如何从科幻小说演变为日常医疗现实。',
    content: `生物与硅的交汇不再局限于科幻小说的领域。神经蕾丝技术和微电极阵列的最新突破正在为未来铺平道路，在这个未来，人脑与外部计算系统之间的高带宽通信不仅是可能的，而且是无缝的。

### 非侵入式系统的崛起

虽然像 Neuralink 这样的公司专注于手术植入物，但新一波初创公司正在探索高保真 EEG 和 fNIRS 帽，这些设备可以在不进行任何切口的情况下读取意图。这些系统正被用于恢复中风患者的行动能力，并为数字环境中的创意表达提供新途径。

### 伦理与主权

随着我们与 AI 驱动的接口更深入地整合，认知自由的问题变得至关重要。谁拥有你思想产生的数据？我们如何防止神经操纵？这些是下一个十年的挑战。`,
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
    content: `空间计算需要对视觉层次进行彻底的重新思考。当世界是你的画布时，传统的按钮和菜单感觉很受限。我们正在走向"基于意图"的设计，系统根据注视和微妙的手势来预测需求。

### 隐形 UI

最好的界面是你看不到的界面。在 AR 和 VR 中，我们利用深度、光线和声音来引导用户。这是极简主义的终极表达——技术消失，只留下体验。

### Apple Vision Pro 与范式转变

随着新空间平台的推出，设计师必须学会以体积而非平面来思考。阴影不再只是美学；它们是交互的功能性线索。`,
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
    content: `锂离子电池为我们服务得很好，但它已经达到了物理极限。固态电池承诺更高的能量密度、更快的充电时间，最重要的是，改善的安全性。

### 突破 1000 公里障碍

主要汽车制造商正在竞相商业化可以让电动汽车在一次 10 分钟充电后续航超过 1000 公里的电池。这将有效消除里程焦虑，并使内燃机永久过时。

### 扩大制造规模

障碍仍然是成本和制造复杂性。目前的技术难以扩展到每年所需的数百万单位，但试点生产线已经显示出有希望的产量。`,
    author: 'Sarah Chen',
    date: '2024年8月15日',
    readTime: '5 分钟',
    category: '可持续发展',
    imageUrl: 'https://picsum.photos/seed/energy/1200/600',
    tags: ['能源', '气候', '创新'],
  },
];

export function getPostBySlug(slug: string): Post | undefined {
  return MOCK_POSTS.find((post) => post.slug === slug);
}

export function getAllPosts(): Post[] {
  return MOCK_POSTS;
}
