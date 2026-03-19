import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { TimelineService } from '../timeline/timeline.service';
import { PublicTimelineResponseDto } from '../timeline/dto';
import {
  PublicArticleQueryDto,
  PublicArticleDetailDto,
  PaginatedPublicArticleListDto,
  ArticleSlugsResponseDto,
  PublicProjectQueryDto,
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
  @ApiResponse({ status: 200, description: '获取成功', type: PublicArticleDetailDto })
  @ApiResponse({ status: 404, description: '文章不存在' })
  @Get('articles/:slug')
  async getArticleBySlug(@Param('slug') slug: string): Promise<PublicArticleDetailDto> {
    return this.publicService.getArticleBySlug(slug);
  }

  // ==================== 项目接口 ====================

  @ApiOperation({ summary: '获取项目列表', description: '获取项目/作品集列表' })
  @ApiResponse({ status: 200, description: '获取成功', type: PaginatedPublicProjectListDto })
  @Get('projects')
  async getProjects(@Query() query: PublicProjectQueryDto): Promise<PaginatedPublicProjectListDto> {
    return this.publicService.getProjects(query);
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
}
