
import { Article, Project, MicroPost, TechStack } from './types';

export const ARTICLES: Article[] = [
  {
    id: '1',
    title: 'Designing with Intent: The Minimalism Philosophy',
    excerpt: 'How stripping away the non-essential leads to more functional and beautiful digital interfaces.',
    date: 'Oct 12, 2023',
    category: 'Design',
    tags: ['UI/UX', 'Minimalism'],
  },
  {
    id: '2',
    title: 'Mastering Framer Motion for React',
    excerpt: 'A deep dive into creating physics-based animations that feel natural to the human eye.',
    date: 'Nov 05, 2023',
    category: 'Development',
    tags: ['React', 'Animation'],
  },
  {
    id: '3',
    title: 'The Future of Web Interactivity',
    excerpt: 'Exploring how generative AI and WebGL are transforming the standard browser experience.',
    date: 'Dec 15, 2023',
    category: 'Tech',
    tags: ['AI', 'Future'],
  }
];

export const PROJECTS: Project[] = [
  {
    id: 'p1',
    title: 'Lumina Dashboard',
    description: 'A data visualization platform for high-growth startups focusing on clarity and speed.',
    techStack: ['React', 'D3.js', 'Tailwind'],
    imageUrl: 'https://picsum.photos/800/600?random=1',
    link: '#',
  },
  {
    id: 'p2',
    title: 'Zenith OS',
    description: 'An experimental browser-based operating system built for productivity.',
    techStack: ['TypeScript', 'Vite', 'Three.js'],
    imageUrl: 'https://picsum.photos/800/600?random=2',
    link: '#',
  },
  {
    id: 'p3',
    title: 'Ether Audio',
    description: 'Spatial audio editing tool designed for collaborative music production.',
    techStack: ['WebAudio API', 'Rust', 'WASM'],
    imageUrl: 'https://picsum.photos/800/600?random=3',
    link: '#',
  }
];

export const MICROPOSTS: MicroPost[] = [
  {
    id: 'm1',
    content: 'Just finished setting up the new studio. The light at 4 PM is just perfect for focused coding sessions. ☕️',
    date: '2 hours ago',
    image: 'https://picsum.photos/600/400?random=10'
  },
  {
    id: 'm2',
    content: 'Typography is the soul of any interface. Spending the whole morning just tweaking the line-height of this blog. Worth it.',
    date: 'Yesterday'
  },
  {
    id: 'm3',
    content: 'The more I learn about browser internals, the more I appreciate the complexity of the "simple" web.',
    date: '3 days ago'
  }
];

export const TECH_STACK: TechStack[] = [
  { name: 'Vue 3', level: 95 },
  { name: 'Pinia', level: 90 },
  { name: 'Next.js', level: 92 },
  { name: 'React', level: 95 },
  { name: 'UniApp', level: 88 },
  { name: 'Electron', level: 85 },
  { name: 'HarmonyOS', level: 80 },
  { name: 'NestJS', level: 85 },
  { name: 'Redis', level: 80 },
  { name: 'JWT', level: 90 },
  { name: 'Python', level: 75 },
  { name: 'Node.js', level: 90 },
];

export const TIMELINE_EVENTS = [
  {
    year: '2017',
    title: '实习启航',
    description: '初入职场，在实习中开启了前端开发的探索之旅，见证了从 JQuery 到现代框架的转型。',
  },
  {
    year: '2019',
    title: '全栈进阶',
    description: '深耕 React/Vue 生态，开始接触 Node.js 后端开发，实现多端覆盖。',
  },
  {
    year: '2022',
    title: '效率革命',
    description: '专注于自动化脚本与提效工具，利用 Python 和 Node.js 优化开发流程。',
  },
  {
    year: '2024',
    title: 'AI 实验室',
    description: '全面拥抱 AI 驱动开发，探索 .cursorrules、提示词工程与多模态交互。',
  },
  {
    year: '2025',
    title: '博思特 AI',
    description: '主导博思特 AI 项目，实现语音/视频通话与数字分身生成的深度集成。',
  },
];
