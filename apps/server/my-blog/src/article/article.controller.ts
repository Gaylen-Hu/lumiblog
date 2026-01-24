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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
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
@ApiTags('文章管理')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'admin/articles', version: '1' })
@UseGuards(JwtAuthGuard)
export class AdminArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @ApiOperation({ summary: '创建文章草稿', description: '创建新的文章草稿' })
  @ApiResponse({ status: 201, description: '创建成功', type: ArticleResponseDto })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 409, description: 'slug 已存在' })
  @Post()
  async create(
    @Body() createArticleDto: CreateArticleDto,
  ): Promise<ArticleResponseDto> {
    return this.articleService.create(createArticleDto);
  }

  @ApiOperation({ summary: '获取文章列表', description: '分页获取文章列表，支持关键词搜索和发布状态筛选' })
  @ApiResponse({ status: 200, description: '获取成功', type: PaginatedAdminArticleListDto })
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

  @ApiOperation({ summary: '获取文章详情', description: '根据 ID 获取文章完整信息' })
  @ApiParam({ name: 'id', description: '文章 ID' })
  @ApiResponse({ status: 200, description: '获取成功', type: ArticleResponseDto })
  @ApiResponse({ status: 404, description: '文章不存在' })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ArticleResponseDto> {
    return this.articleService.findById(id);
  }

  @ApiOperation({ summary: '更新文章', description: '更新文章内容' })
  @ApiParam({ name: 'id', description: '文章 ID' })
  @ApiResponse({ status: 200, description: '更新成功', type: ArticleResponseDto })
  @ApiResponse({ status: 404, description: '文章不存在' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateArticleDto: UpdateArticleDto,
  ): Promise<ArticleResponseDto> {
    return this.articleService.update(id, updateArticleDto);
  }

  @ApiOperation({ summary: '删除文章', description: '删除指定文章' })
  @ApiParam({ name: 'id', description: '文章 ID' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: '文章不存在' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.articleService.delete(id);
  }

  @ApiOperation({ summary: '发布文章', description: '将草稿文章发布' })
  @ApiParam({ name: 'id', description: '文章 ID' })
  @ApiResponse({ status: 200, description: '发布成功', type: ArticleResponseDto })
  @ApiResponse({ status: 404, description: '文章不存在' })
  @Post(':id/publish')
  async publish(@Param('id') id: string): Promise<ArticleResponseDto> {
    return this.articleService.publish(id);
  }

  @ApiOperation({ summary: '取消发布文章', description: '将已发布文章转为草稿' })
  @ApiParam({ name: 'id', description: '文章 ID' })
  @ApiResponse({ status: 200, description: '取消发布成功', type: ArticleResponseDto })
  @ApiResponse({ status: 404, description: '文章不存在' })
  @Post(':id/unpublish')
  async unpublish(@Param('id') id: string): Promise<ArticleResponseDto> {
    return this.articleService.unpublish(id);
  }

  @ApiOperation({ summary: 'AI 翻译文章', description: '使用 AI 将文章翻译为目标语言' })
  @ApiParam({ name: 'id', description: '文章 ID' })
  @ApiResponse({ status: 200, description: '翻译成功', type: TranslateArticleResponseDto })
  @ApiResponse({ status: 404, description: '文章不存在' })
  @Post(':id/translate')
  async translate(
    @Param('id') id: string,
    @Body() dto: TranslateArticleDto,
  ): Promise<TranslateArticleResponseDto> {
    return this.articleService.translateArticle(id, dto);
  }

  @ApiOperation({ summary: 'AI 生成 SEO 信息', description: '使用 AI 自动生成文章的 SEO 标题、描述和关键词' })
  @ApiParam({ name: 'id', description: '文章 ID' })
  @ApiResponse({ status: 200, description: '生成成功', type: SeoOptimizeArticleResponseDto })
  @ApiResponse({ status: 404, description: '文章不存在' })
  @Post(':id/seo-optimize')
  async optimizeSeo(
    @Param('id') id: string,
  ): Promise<SeoOptimizeArticleResponseDto> {
    return this.articleService.optimizeSeo(id);
  }

  @ApiOperation({ summary: '发布到微信公众号', description: '将文章发布到微信公众号草稿箱或直接发布' })
  @ApiParam({ name: 'id', description: '文章 ID' })
  @ApiResponse({ status: 200, description: '发布成功', type: PublishToWechatResponseDto })
  @ApiResponse({ status: 404, description: '文章不存在' })
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
@ApiTags('文章')
@Controller({ path: 'articles', version: '1' })
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @ApiOperation({ summary: '获取已发布文章列表', description: '分页获取已发布的文章列表（公开接口）' })
  @ApiResponse({ status: 200, description: '获取成功', type: PaginatedArticleListDto })
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
