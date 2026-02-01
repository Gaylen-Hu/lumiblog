import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import {
  PublicArticleQueryDto,
  PublicArticleListItemDto,
  PublicArticleDetailDto,
  PaginatedPublicArticleListDto,
  ArticleSlugsResponseDto,
  AuthorDto,
  CategoryBriefDto,
  TagBriefDto,
  SeoInfoDto,
  PublicProjectQueryDto,
  PublicProjectDto,
  PaginatedPublicProjectListDto,
  PublicCategoryDto,
  PublicCategoryListDto,
  PublicTagDto,
  PublicTagListDto,
  SiteConfigDto,
  SocialLinksDto,
  SiteOwnerDto,
  SiteSeoDto,
  SearchQueryDto,
  SearchResultDto,
  SearchResultItemDto,
} from './dto';

/** 每分钟阅读字数（用于计算阅读时间） */
const WORDS_PER_MINUTE = 200;

/** 内部文章类型 */
interface InternalArticle {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  excerpt: string | null;
  coverImage: string | null;
  isPublished: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
  seoTitle: string | null;
  seoDescription: string | null;
  author: { name: string; avatar: string | null; bio: string | null };
  category: { id: string; name: string; slug: string } | null;
  tags: { id: string; name: string; slug: string }[];
}

/** 内部项目类型 */
interface InternalProject {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  coverImage: string | null;
  link: string | null;
  githubUrl: string | null;
  featured: boolean;
  order: number;
}

/** 内部分类类型 */
interface InternalCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  articleCount: number;
}

/** 内部标签类型 */
interface InternalTag {
  id: string;
  name: string;
  slug: string;
  articleCount: number;
}

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  // TODO: 集成 Prisma 后替换为真实数据库操作
  private articles: InternalArticle[] = [];
  private projects: InternalProject[] = [];
  private categories: InternalCategory[] = [];
  private tags: InternalTag[] = [];
  private idCounter = 1;

  constructor() {
    this.initMockData();
  }

  /**
   * 获取公开文章列表
   */
  async getArticles(query: PublicArticleQueryDto): Promise<PaginatedPublicArticleListDto> {
    const { page = 1, pageSize = 10, category, tag, search } = query;

    let filtered = this.articles.filter((a) => a.isPublished);

    // 分类筛选
    if (category) {
      filtered = filtered.filter((a) => a.category?.slug === category);
    }

    // 标签筛选
    if (tag) {
      filtered = filtered.filter((a) => a.tags.some((t) => t.slug === tag));
    }

    // 搜索筛选
    if (search) {
      const keyword = search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(keyword) ||
          a.excerpt?.toLowerCase().includes(keyword),
      );
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered
      .sort((a, b) => {
        const dateA = a.publishedAt?.getTime() ?? 0;
        const dateB = b.publishedAt?.getTime() ?? 0;
        return dateB - dateA;
      })
      .slice(start, start + pageSize);

    const data = items.map((article) => this.toArticleListItem(article));

    return new PaginatedPublicArticleListDto({ data, total, page, pageSize });
  }


  /**
   * 根据 slug 获取文章详情
   */
  async getArticleBySlug(slug: string): Promise<PublicArticleDetailDto> {
    const article = this.articles.find((a) => a.slug === slug && a.isPublished);
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    return this.toArticleDetail(article);
  }

  /**
   * 获取所有已发布文章的 slug 列表（用于 SSG）
   */
  async getArticleSlugs(): Promise<ArticleSlugsResponseDto> {
    const slugs = this.articles
      .filter((a) => a.isPublished)
      .map((a) => a.slug);
    return new ArticleSlugsResponseDto(slugs);
  }

  /**
   * 获取项目列表
   */
  async getProjects(query: PublicProjectQueryDto): Promise<PaginatedPublicProjectListDto> {
    const { page = 1, pageSize = 10, featured } = query;

    let filtered = [...this.projects];

    if (featured !== undefined) {
      filtered = filtered.filter((p) => p.featured === featured);
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered
      .sort((a, b) => a.order - b.order)
      .slice(start, start + pageSize);

    const data = items.map((project) => new PublicProjectDto(project));

    return new PaginatedPublicProjectListDto({ data, total, page, pageSize });
  }

  /**
   * 获取分类列表
   */
  async getCategories(): Promise<PublicCategoryListDto> {
    const data = this.categories.map((c) => new PublicCategoryDto(c));
    return new PublicCategoryListDto(data);
  }

  /**
   * 获取标签列表
   */
  async getTags(): Promise<PublicTagListDto> {
    const data = this.tags.map((t) => new PublicTagDto(t));
    return new PublicTagListDto(data);
  }

  /**
   * 获取站点配置
   */
  async getSiteConfig(): Promise<SiteConfigDto> {
    // TODO: 从数据库或配置文件读取
    return new SiteConfigDto({
      siteName: 'NOVA',
      siteDescription: '探索技术与设计的前沿',
      logo: null,
      favicon: null,
      socialLinks: new SocialLinksDto({
        github: 'https://github.com/example',
        twitter: 'https://twitter.com/example',
      }),
      owner: new SiteOwnerDto({
        name: 'John Doe',
        avatar: null,
        bio: '全栈开发者，热爱技术与设计',
        email: 'hello@example.com',
      }),
      seo: new SiteSeoDto({
        defaultTitle: 'NOVA - 探索技术与设计的前沿',
        defaultDescription: '一个关于技术、设计和创新的博客',
        defaultOgImage: null,
      }),
    });
  }

  /**
   * 搜索文章
   */
  async search(query: SearchQueryDto): Promise<SearchResultDto> {
    const { q, page = 1, pageSize = 10 } = query;
    const keyword = q.toLowerCase();

    const filtered = this.articles.filter(
      (a) =>
        a.isPublished &&
        (a.title.toLowerCase().includes(keyword) ||
          a.excerpt?.toLowerCase().includes(keyword) ||
          a.content?.toLowerCase().includes(keyword)),
    );

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered
      .sort((a, b) => {
        const dateA = a.publishedAt?.getTime() ?? 0;
        const dateB = b.publishedAt?.getTime() ?? 0;
        return dateB - dateA;
      })
      .slice(start, start + pageSize);

    const data = items.map((article) => this.toSearchResultItem(article, keyword));

    return new SearchResultDto({ data, total, page, pageSize });
  }

  /**
   * 计算阅读时间
   */
  private calculateReadTime(content: string | null): string {
    if (!content) return '1 分钟';
    const wordCount = content.length;
    const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE);
    return `${minutes} 分钟`;
  }

  /**
   * 生成高亮文本
   */
  private generateHighlight(content: string | null, keyword: string): string | null {
    if (!content) return null;
    const index = content.toLowerCase().indexOf(keyword);
    if (index === -1) return null;

    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + keyword.length + 50);
    let highlight = content.slice(start, end);

    if (start > 0) highlight = '...' + highlight;
    if (end < content.length) highlight = highlight + '...';

    // 添加高亮标记
    const regex = new RegExp(`(${keyword})`, 'gi');
    return highlight.replace(regex, '<mark>$1</mark>');
  }


  /**
   * 转换为文章列表项 DTO
   */
  private toArticleListItem(article: InternalArticle): PublicArticleListItemDto {
    return new PublicArticleListItemDto({
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      author: new AuthorDto(article.author),
      publishedAt: article.publishedAt!,
      readTime: this.calculateReadTime(article.content),
      category: article.category ? new CategoryBriefDto(article.category) : null,
      coverImage: article.coverImage,
      tags: article.tags.map((t) => new TagBriefDto(t)),
    });
  }

  /**
   * 转换为文章详情 DTO
   */
  private toArticleDetail(article: InternalArticle): PublicArticleDetailDto {
    return new PublicArticleDetailDto({
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      content: article.content ?? '',
      author: new AuthorDto({ ...article.author, bio: article.author.bio }),
      publishedAt: article.publishedAt!,
      updatedAt: article.updatedAt,
      readTime: this.calculateReadTime(article.content),
      category: article.category ? new CategoryBriefDto(article.category) : null,
      coverImage: article.coverImage,
      tags: article.tags.map((t) => new TagBriefDto(t)),
      seo: new SeoInfoDto({
        metaTitle: article.seoTitle,
        metaDescription: article.seoDescription,
        ogImage: article.coverImage,
      }),
    });
  }

  /**
   * 转换为搜索结果项 DTO
   */
  private toSearchResultItem(article: InternalArticle, keyword: string): SearchResultItemDto {
    return new SearchResultItemDto({
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      highlight: this.generateHighlight(article.content, keyword),
      category: article.category?.name ?? null,
      publishedAt: article.publishedAt!,
    });
  }

  /**
   * 初始化 Mock 数据
   */
  private initMockData(): void {
    // 初始化分类
    this.categories = [
      { id: '1', name: '技术', slug: 'tech', description: '技术相关文章', articleCount: 2 },
      { id: '2', name: '设计', slug: 'design', description: '设计相关文章', articleCount: 1 },
    ];

    // 初始化标签
    this.tags = [
      { id: '1', name: 'TypeScript', slug: 'typescript', articleCount: 2 },
      { id: '2', name: 'React', slug: 'react', articleCount: 1 },
      { id: '3', name: 'NestJS', slug: 'nestjs', articleCount: 1 },
    ];

    // 初始化文章
    const now = new Date();
    this.articles = [
      {
        id: '1',
        slug: 'future-of-neural-interfaces',
        title: '神经接口的未来',
        content: '# 神经接口的未来\n\n这是一篇关于神经接口技术发展的文章...',
        excerpt: '探索神经接口技术的最新进展和未来可能性',
        coverImage: 'https://picsum.photos/800/400?random=1',
        isPublished: true,
        publishedAt: new Date(now.getTime() - 86400000),
        updatedAt: now,
        seoTitle: '神经接口的未来 - 技术前沿',
        seoDescription: '深入探讨神经接口技术的发展趋势',
        author: { name: 'John Doe', avatar: null, bio: '全栈开发者' },
        category: { id: '1', name: '技术', slug: 'tech' },
        tags: [{ id: '1', name: 'TypeScript', slug: 'typescript' }],
      },
      {
        id: '2',
        slug: 'minimalism-in-spatial-computing',
        title: '空间计算中的极简主义',
        content: '# 空间计算中的极简主义\n\n设计原则在空间计算中的应用...',
        excerpt: '探讨极简主义设计在空间计算领域的应用',
        coverImage: 'https://picsum.photos/800/400?random=2',
        isPublished: true,
        publishedAt: new Date(now.getTime() - 172800000),
        updatedAt: now,
        seoTitle: '空间计算中的极简主义',
        seoDescription: '极简主义设计在空间计算中的实践',
        author: { name: 'John Doe', avatar: null, bio: '全栈开发者' },
        category: { id: '2', name: '设计', slug: 'design' },
        tags: [{ id: '2', name: 'React', slug: 'react' }],
      },
      {
        id: '3',
        slug: 'building-restful-api-with-nestjs',
        title: '使用 NestJS 构建 RESTful API',
        content: '# 使用 NestJS 构建 RESTful API\n\n本文介绍如何使用 NestJS 框架...',
        excerpt: '学习如何使用 NestJS 构建高质量的 RESTful API',
        coverImage: 'https://picsum.photos/800/400?random=3',
        isPublished: true,
        publishedAt: new Date(now.getTime() - 259200000),
        updatedAt: now,
        seoTitle: 'NestJS RESTful API 开发指南',
        seoDescription: '详细介绍 NestJS 框架的使用方法',
        author: { name: 'John Doe', avatar: null, bio: '全栈开发者' },
        category: { id: '1', name: '技术', slug: 'tech' },
        tags: [
          { id: '1', name: 'TypeScript', slug: 'typescript' },
          { id: '3', name: 'NestJS', slug: 'nestjs' },
        ],
      },
    ];

    // 初始化项目
    this.projects = [
      {
        id: '1',
        title: 'My Blog',
        description: '一个现代化的博客系统，支持多语言和 SEO 优化',
        techStack: ['Next.js', 'NestJS', 'TypeScript', 'Tailwind CSS'],
        coverImage: 'https://picsum.photos/800/400?random=4',
        link: 'https://example.com',
        githubUrl: 'https://github.com/example/my-blog',
        featured: true,
        order: 1,
      },
      {
        id: '2',
        title: 'Task Manager',
        description: '一个简洁高效的任务管理应用',
        techStack: ['React', 'Node.js', 'MongoDB'],
        coverImage: 'https://picsum.photos/800/400?random=5',
        link: null,
        githubUrl: 'https://github.com/example/task-manager',
        featured: true,
        order: 2,
      },
    ];

    this.logger.log('Mock 数据初始化完成');
  }
}
