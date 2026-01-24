import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto, CategoryTreeNodeDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * 分类管理控制器（管理端）
 */
@ApiTags('分类管理')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'admin/categories', version: '1' })
@UseGuards(JwtAuthGuard)
export class AdminCategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({ summary: '创建分类', description: '创建新的文章分类' })
  @ApiResponse({ status: 201, description: '创建成功', type: CategoryResponseDto })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 409, description: 'slug 已存在' })
  @Post()
  async create(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoryService.create(dto);
  }

  @ApiOperation({ summary: '获取分类列表', description: '获取所有分类（扁平列表）' })
  @ApiResponse({ status: 200, description: '获取成功', type: [CategoryResponseDto] })
  @Get()
  async findAll(): Promise<CategoryResponseDto[]> {
    return this.categoryService.findAll();
  }

  @ApiOperation({ summary: '获取分类详情', description: '根据 ID 获取分类详细信息' })
  @ApiParam({ name: 'id', description: '分类 ID' })
  @ApiResponse({ status: 200, description: '获取成功', type: CategoryResponseDto })
  @ApiResponse({ status: 404, description: '分类不存在' })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<CategoryResponseDto> {
    return this.categoryService.findOne(id);
  }

  @ApiOperation({ summary: '更新分类', description: '更新分类信息（不允许修改父级）' })
  @ApiParam({ name: 'id', description: '分类 ID' })
  @ApiResponse({ status: 200, description: '更新成功', type: CategoryResponseDto })
  @ApiResponse({ status: 404, description: '分类不存在' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.update(id, dto);
  }

  @ApiOperation({ summary: '删除分类', description: '删除指定分类（如有子分类需先删除子分类）' })
  @ApiParam({ name: 'id', description: '分类 ID' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: '分类不存在' })
  @ApiResponse({ status: 400, description: '存在子分类，无法删除' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.categoryService.remove(id);
  }
}

/**
 * 分类公开控制器（C端）
 */
@ApiTags('分类')
@Controller({ path: 'categories', version: '1' })
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({ summary: '获取分类树', description: '获取分类的树形结构（公开接口）' })
  @ApiResponse({ status: 200, description: '获取成功', type: [CategoryTreeNodeDto] })
  @Get('tree')
  async findTree(): Promise<CategoryTreeNodeDto[]> {
    return this.categoryService.findTree();
  }

  @ApiOperation({ summary: '获取分类列表', description: '获取所有分类（扁平列表，公开接口）' })
  @ApiResponse({ status: 200, description: '获取成功', type: [CategoryResponseDto] })
  @Get()
  async findAll(): Promise<CategoryResponseDto[]> {
    return this.categoryService.findAll();
  }
}
