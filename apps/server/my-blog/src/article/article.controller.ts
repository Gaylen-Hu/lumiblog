import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ArticleService } from './article.service';
import {
  CreateArticleDto,
  QueryArticleDto,
  ArticleResponseDto,
  PaginatedArticleListDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * 文章管理控制器（管理端）
 */
@Controller('admin/articles')
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
}

/**
 * 文章公开控制器（C端）
 */
@Controller('articles')
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
