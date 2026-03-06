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
import { ProjectService } from './project.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  QueryProjectDto,
  ProjectResponseDto,
  PaginatedProjectListDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * 项目管理控制器
 */
@ApiTags('项目管理')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'admin/projects', version: '1' })
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @ApiOperation({ summary: '创建项目' })
  @ApiResponse({ status: 201, description: '创建成功', type: ProjectResponseDto })
  @ApiResponse({ status: 400, description: '参数错误' })
  @Post()
  async create(
    @Body() createProjectDto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectService.create(createProjectDto);
  }

  @ApiOperation({ summary: '获取项目列表', description: '分页获取项目列表，支持 featured 筛选' })
  @ApiResponse({ status: 200, description: '获取成功', type: PaginatedProjectListDto })
  @Get()
  async findAll(
    @Query() query: QueryProjectDto,
  ): Promise<PaginatedProjectListDto> {
    return this.projectService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      featured: query.featured,
    });
  }

  @ApiOperation({ summary: '获取项目详情' })
  @ApiParam({ name: 'id', description: '项目 ID' })
  @ApiResponse({ status: 200, description: '获取成功', type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: '项目不存在' })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ProjectResponseDto> {
    return this.projectService.findOne(id);
  }

  @ApiOperation({ summary: '更新项目' })
  @ApiParam({ name: 'id', description: '项目 ID' })
  @ApiResponse({ status: 200, description: '更新成功', type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: '项目不存在' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectService.update(id, updateProjectDto);
  }

  @ApiOperation({ summary: '删除项目' })
  @ApiParam({ name: 'id', description: '项目 ID' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: '项目不存在' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.projectService.remove(id);
  }
}
