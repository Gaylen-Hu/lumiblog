import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ArticleService } from './article.service';
import {
  CreateArticleDto,
  UpdateArticleDto,
  QueryArticleDto,
  AdminQueryArticleDto,
  ArticleResponseDto,
  PaginatedArticleListDto,
  PaginatedAdminArticleListDto,
  TranslateArticleDto,
  TranslateArticleResponseDto,
  SeoOptimizeArticleResponseDto,
  PublishToWechatDto,
  PublishToWechatResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * 文章管理控制器（管理端）
 */
@Controller({ path: 'admin/articles', version: '1' })
@UseGuards(JwtAuthGuard)
export class AdminArticleController {
  constructor(private readonly articleService: ArticleService) {}

  /**
   * 创建文章草稿
   */
  @Post()
  async create(
    @Body() createArticleDto: CreateArticleDto,
  ): Promise<ArticleResponseDto> {
    return this.articleService.create(createArticleDto);
  }

  /**
   * 获取文章列表（管理端）
   */
  @Get()
  async findAll(
    @Query() query: AdminQueryArticleDto,
  ): Promise<PaginatedAdminArticleListDto> {
    return this.articleService.findAdminList({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      keyword: query.keyword,
      isPublished: query.isPublished,
    });
  }

  /**
   * 获取单个文章
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ArticleResponseDto> {
    return this.articleService.findById(id);
  }

  /**
   * 更新文章
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateArticleDto: UpdateArticleDto,
  ): Promise<ArticleResponseDto> {
    return this.articleService.update(id, updateArticleDto);
  }

  /**
   * 删除文章
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.articleService.delete(id);
  }

  /**
   * 发布文章
   */
  @Post(':id/publish')
  async publish(@Param('id') id: string): Promise<ArticleResponseDto> {
    return this.articleService.publish(id);
  }

  /**
   * 取消发布文章
   */
  @Post(':id/unpublish')
  async unpublish(@Param('id') id: string): Promise<ArticleResponseDto> {
    return this.articleService.unpublish(id);
  }

  /**
   * AI 翻译文章
   */
  @Post(':id/translate')
  async translate(
    @Param('id') id: string,
    @Body() dto: TranslateArticleDto,
  ): Promise<TranslateArticleResponseDto> {
    return this.articleService.translateArticle(id, dto);
  }

  /**
   * AI 生成 SEO 信息
   */
  @Post(':id/seo-optimize')
  async optimizeSeo(
    @Param('id') id: string,
  ): Promise<SeoOptimizeArticleResponseDto> {
    return this.articleService.optimizeSeo(id);
  }

  /**
   * 发布到微信公众号
   */
  @Post(':id/publish-wechat')
  async publishToWechat(
    @Param('id') id: string,
    @Body() dto: PublishToWechatDto,
  ): Promise<PublishToWechatResponseDto> {
    return this.articleService.publishToWechat(id, dto);
  }
}

/**
 * 文章公开控制器（C端）
 */
@Controller({ path: 'articles', version: '1' })
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  /**
   * 查询已发布文章列表
   */
  @Get()
  async findAll(
    @Query() query: QueryArticleDto,
  ): Promise<PaginatedArticleListDto> {
    return this.articleService.findPublishedList({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });
  }
}
