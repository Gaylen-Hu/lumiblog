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
  ApiQuery,
} from '@nestjs/swagger';
import { TagService } from './tag.service';
import { CreateTagDto, UpdateTagDto, TagResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * 标签管理控制器（管理端）
 */
@ApiTags('标签管理')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'admin/tags', version: '1' })
@UseGuards(JwtAuthGuard)
export class AdminTagController {
  constructor(private readonly tagService: TagService) {}

  @ApiOperation({ summary: '创建标签', description: '创建新的文章标签' })
  @ApiResponse({ status: 201, description: '创建成功', type: TagResponseDto })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 409, description: 'slug 已存在' })
  @Post()
  async create(@Body() dto: CreateTagDto): Promise<TagResponseDto> {
    return this.tagService.create(dto);
  }

  @ApiOperation({ summary: '获取标签列表', description: '获取所有标签' })
  @ApiResponse({ status: 200, description: '获取成功', type: [TagResponseDto] })
  @Get()
  async findAll(): Promise<TagResponseDto[]> {
    return this.tagService.findAll();
  }

  @ApiOperation({ summary: '获取标签详情', description: '根据 ID 获取标签详细信息' })
  @ApiParam({ name: 'id', description: '标签 ID' })
  @ApiResponse({ status: 200, description: '获取成功', type: TagResponseDto })
  @ApiResponse({ status: 404, description: '标签不存在' })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<TagResponseDto> {
    return this.tagService.findOne(id);
  }

  @ApiOperation({ summary: '更新标签', description: '更新标签信息' })
  @ApiParam({ name: 'id', description: '标签 ID' })
  @ApiResponse({ status: 200, description: '更新成功', type: TagResponseDto })
  @ApiResponse({ status: 404, description: '标签不存在' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTagDto,
  ): Promise<TagResponseDto> {
    return this.tagService.update(id, dto);
  }

  @ApiOperation({ summary: '删除标签', description: '删除指定标签' })
  @ApiParam({ name: 'id', description: '标签 ID' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: '标签不存在' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.tagService.remove(id);
  }
}

/**
 * 标签公开控制器（C端）
 */
@ApiTags('标签')
@Controller({ path: 'tags', version: '1' })
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @ApiOperation({ summary: '获取标签列表', description: '获取所有标签（公开接口）' })
  @ApiResponse({ status: 200, description: '获取成功', type: [TagResponseDto] })
  @Get()
  async findAll(): Promise<TagResponseDto[]> {
    return this.tagService.findAll();
  }

  @ApiOperation({ summary: '获取热门标签', description: '获取文章数量最多的标签' })
  @ApiQuery({ name: 'limit', description: '返回数量', required: false, example: 10 })
  @ApiResponse({ status: 200, description: '获取成功', type: [TagResponseDto] })
  @Get('popular')
  async findPopular(@Query('limit') limit?: string): Promise<TagResponseDto[]> {
    return this.tagService.findPopular(limit ? parseInt(limit, 10) : 10);
  }
}
