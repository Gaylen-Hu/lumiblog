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
import { ColumnService } from './column.service';
import {
  CreateColumnDto,
  UpdateColumnDto,
  QueryColumnDto,
  AddColumnArticleDto,
  ReorderColumnArticlesDto,
} from './dto';
import {
  ColumnResponse,
  ColumnDetailResponse,
  PaginatedColumnResponse,
} from './domain/column.model';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * 专栏管理控制器（管理端）
 */
@ApiTags('专栏管理')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'admin/columns', version: '1' })
@UseGuards(JwtAuthGuard)
export class AdminColumnController {
  constructor(private readonly columnService: ColumnService) {}

  @ApiOperation({ summary: '创建专栏' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 409, description: 'slug 已存在' })
  @Post()
  async create(@Body() dto: CreateColumnDto): Promise<ColumnResponse> {
    return this.columnService.create(dto);
  }

  @ApiOperation({ summary: '分页查询专栏列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @Get()
  async findAll(@Query() query: QueryColumnDto): Promise<PaginatedColumnResponse> {
    return this.columnService.findAll(query);
  }

  @ApiOperation({ summary: '获取专栏详情' })
  @ApiParam({ name: 'id', description: '专栏 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '专栏不存在' })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ColumnDetailResponse> {
    return this.columnService.findOne(id);
  }

  @ApiOperation({ summary: '更新专栏' })
  @ApiParam({ name: 'id', description: '专栏 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '专栏不存在' })
  @ApiResponse({ status: 409, description: 'slug 已存在' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateColumnDto,
  ): Promise<ColumnResponse> {
    return this.columnService.update(id, dto);
  }

  @ApiOperation({ summary: '删除专栏' })
  @ApiParam({ name: 'id', description: '专栏 ID' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: '专栏不存在' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.columnService.remove(id);
  }

  @ApiOperation({ summary: '添加文章到专栏' })
  @ApiParam({ name: 'id', description: '专栏 ID' })
  @ApiResponse({ status: 201, description: '添加成功' })
  @ApiResponse({ status: 404, description: '专栏或文章不存在' })
  @ApiResponse({ status: 409, description: '文章已在专栏中' })
  @Post(':id/articles')
  @HttpCode(HttpStatus.CREATED)
  async addArticle(
    @Param('id') id: string,
    @Body() dto: AddColumnArticleDto,
  ): Promise<void> {
    return this.columnService.addArticle(id, dto);
  }

  @ApiOperation({ summary: '从专栏移除文章' })
  @ApiParam({ name: 'id', description: '专栏 ID' })
  @ApiParam({ name: 'articleId', description: '文章 ID' })
  @ApiResponse({ status: 204, description: '移除成功' })
  @ApiResponse({ status: 404, description: '关联不存在' })
  @Delete(':id/articles/:articleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeArticle(
    @Param('id') id: string,
    @Param('articleId') articleId: string,
  ): Promise<void> {
    return this.columnService.removeArticle(id, articleId);
  }

  @ApiOperation({ summary: '重新排序专栏文章' })
  @ApiParam({ name: 'id', description: '专栏 ID' })
  @ApiResponse({ status: 200, description: '排序成功' })
  @ApiResponse({ status: 400, description: '文章列表不完整或包含无效 ID' })
  @Patch(':id/articles/reorder')
  async reorderArticles(
    @Param('id') id: string,
    @Body() dto: ReorderColumnArticlesDto,
  ): Promise<void> {
    return this.columnService.reorderArticles(id, dto);
  }
}
