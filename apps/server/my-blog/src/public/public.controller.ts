import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { TimelineService } from '../timeline/timeline.service';
import { ColumnPublicService } from '../column/column-public.service';
import { PublicTimelineResponseDto } from '../timeline/dto';
import {
  PublicColumnListItem,
  PublicColumnDetail,
  ColumnArticleNav,
} from '../column/domain/column.model';
import {
  PublicArticleQueryDto,
  PublicArticleDetailDto,
  PaginatedPublicArticleListDto,
  ArticleSlugsResponseDto,
  PublicProjectQueryDto,
  PublicProjectDto,
  PaginatedPublicProjectListDto,
  PublicCategoryListDto,
  PublicTagListDto,
  SiteConfigDto,
  SearchQueryDto,
  SearchResultDto,
  SiteStatsDto,
} from './dto';

/**
 * 公开接口控制器（博客前端使用）
 */
@ApiTags('公开接口')
@Controller({ path: 'public', version: '1' })
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly timelineService: TimelineService,
    private readonly columnPublicService: ColumnPublicService,
  ) {}

  // ==================== 文章接口 ====================

  @ApiOperation({ summary: '获取文章列表', description: '获取公开发布的文章列表，支持分页和筛选' })
  @ApiResponse({ status: 200, description: '获取成功', type: PaginatedPublicArticleListDto })
  @Get('articles')
  async getArticles(@Query() query: PublicArticleQueryDto): Promise<PaginatedPublicArticleListDto> {
    return this.publicService.getArticles(query);
  }

  @ApiOperation({ summary: '获取文章 Slugs', description: '获取所有已发布文章的 slug 列表（用于 SSG）' })
  @ApiResponse({ status: 200, description: '获取成功', type: ArticleSlugsResponseDto })
  @Get('articles/slugs')
  async getArticleSlugs(): Promise<ArticleSlugsResponseDto> {
    return this.publicService.getArticleSlugs();
  }

  @ApiOperation({ summary: '获取文章详情', description: '根据 slug 获取单篇文章的完整内容' })
  @ApiParam({ name: 'slug', description: '文章 slug' })
  @ApiQuery({ name: 'locale', required: false, description: '语言标识' })
  @ApiResponse({ status: 200, description: '获取成功', type: PublicArticleDetailDto })
  @ApiResponse({ status: 404, description: '文章不存在' })
  @Get('articles/:slug')
  async getArticleBySlug(
    @Param('slug') slug: string,
    @Query('locale') locale?: string,
  ): Promise<PublicArticleDetailDto> {
    return this.publicService.getArticleBySlug(slug, locale);
  }

  // ==================== 项目接口 ====================

  @ApiOperation({ summary: '获取项目列表', description: '获取项目/作品集列表' })
  @ApiResponse({ status: 200, description: '获取成功', type: PaginatedPublicProjectListDto })
  @Get('projects')
  async getProjects(@Query() query: PublicProjectQueryDto): Promise<PaginatedPublicProjectListDto> {
    return this.publicService.getProjects(query);
  }

  @ApiOperation({ summary: '获取项目详情', description: '根据 ID 获取单个项目的完整信息' })
  @ApiParam({ name: 'id', description: '项目 ID' })
  @ApiResponse({ status: 200, description: '获取成功', type: PublicProjectDto })
  @ApiResponse({ status: 404, description: '项目不存在' })
  @Get('projects/:id')
  async getProjectById(@Param('id') id: string): Promise<PublicProjectDto> {
    return this.publicService.getProjectById(id);
  }

  // ==================== 分类接口 ====================

  @ApiOperation({ summary: '获取分类列表', description: '获取所有分类及其文章数量' })
  @ApiResponse({ status: 200, description: '获取成功', type: PublicCategoryListDto })
  @Get('categories')
  async getCategories(): Promise<PublicCategoryListDto> {
    return this.publicService.getCategories();
  }

  // ==================== 标签接口 ====================

  @ApiOperation({ summary: '获取标签列表', description: '获取所有标签及其文章数量' })
  @ApiResponse({ status: 200, description: '获取成功', type: PublicTagListDto })
  @Get('tags')
  async getTags(): Promise<PublicTagListDto> {
    return this.publicService.getTags();
  }

  // ==================== 站点配置接口 ====================

  @ApiOperation({ summary: '获取站点配置', description: '获取站点基本配置信息' })
  @ApiResponse({ status: 200, description: '获取成功', type: SiteConfigDto })
  @Get('site-config')
  async getSiteConfig(): Promise<SiteConfigDto> {
    return this.publicService.getSiteConfig();
  }

  // ==================== 搜索接口 ====================

  @ApiOperation({ summary: '搜索文章', description: '全文搜索文章' })
  @ApiResponse({ status: 200, description: '搜索成功', type: SearchResultDto })
  @Get('search')
  async search(@Query() query: SearchQueryDto): Promise<SearchResultDto> {
    return this.publicService.search(query);
  }

  // ==================== 统计接口 ====================

  @ApiOperation({ summary: '获取站点统计', description: '获取文章数、经验年数等统计数据' })
  @ApiResponse({ status: 200, description: '获取成功', type: SiteStatsDto })
  @Get('stats')
  async getStats(): Promise<SiteStatsDto> {
    return this.publicService.getStats();
  }

  // ==================== 时间轴接口 ====================

  @ApiOperation({ summary: '获取时间轴列表', description: '获取所有可见的时间轴条目，按 order 升序排列' })
  @ApiResponse({ status: 200, description: '获取成功', type: [PublicTimelineResponseDto] })
  @Get('timeline')
  async getTimeline(): Promise<PublicTimelineResponseDto[]> {
    return this.timelineService.findPublished();
  }

  // ==================== 专栏接口 ====================

  @ApiOperation({ summary: '获取已发布专栏列表', description: '返回所有已发布专栏，按 sortOrder 升序排列' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @Get('columns')
  async getPublishedColumns(): Promise<PublicColumnListItem[]> {
    return this.columnPublicService.getPublishedColumns();
  }

  @ApiOperation({ summary: '获取专栏详情', description: '根据 slug 获取专栏详情及其已发布文章列表' })
  @ApiParam({ name: 'slug', description: '专栏 slug' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '专栏不存在或未发布' })
  @Get('columns/:slug')
  async getColumnBySlug(@Param('slug') slug: string): Promise<PublicColumnDetail> {
    return this.columnPublicService.getColumnBySlug(slug);
  }

  @ApiOperation({ summary: '获取专栏内文章导航', description: '获取文章在指定专栏中的前后导航信息' })
  @ApiParam({ name: 'slug', description: '专栏 slug' })
  @ApiParam({ name: 'articleId', description: '文章 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '专栏不存在或文章不属于该专栏' })
  @Get('columns/:slug/nav/:articleId')
  async getColumnArticleNav(
    @Param('slug') slug: string,
    @Param('articleId') articleId: string,
  ): Promise<ColumnArticleNav> {
    return this.columnPublicService.getArticleNav(slug, articleId);
  }
}
