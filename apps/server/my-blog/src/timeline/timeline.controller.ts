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
import { TimelineService } from './timeline.service';
import {
  CreateTimelineDto,
  UpdateTimelineDto,
  QueryTimelineDto,
  TimelineResponseDto,
  PaginatedTimelineListDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * 时间轴管理控制器
 */
@ApiTags('时间轴管理')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'admin/timeline', version: '1' })
@UseGuards(JwtAuthGuard)
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @ApiOperation({ summary: '创建时间轴条目' })
  @ApiResponse({ status: 201, description: '创建成功', type: TimelineResponseDto })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTimelineDto): Promise<TimelineResponseDto> {
    return this.timelineService.create(dto);
  }

  @ApiOperation({ summary: '获取时间轴条目列表', description: '分页获取时间轴条目列表' })
  @ApiResponse({ status: 200, description: '获取成功', type: PaginatedTimelineListDto })
  @ApiResponse({ status: 401, description: '未授权' })
  @Get()
  async findAll(@Query() query: QueryTimelineDto): Promise<PaginatedTimelineListDto> {
    return this.timelineService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });
  }

  @ApiOperation({ summary: '获取时间轴条目详情' })
  @ApiParam({ name: 'id', description: '条目 ID' })
  @ApiResponse({ status: 200, description: '获取成功', type: TimelineResponseDto })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '条目不存在' })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<TimelineResponseDto> {
    return this.timelineService.findOne(id);
  }

  @ApiOperation({ summary: '更新时间轴条目' })
  @ApiParam({ name: 'id', description: '条目 ID' })
  @ApiResponse({ status: 200, description: '更新成功', type: TimelineResponseDto })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '条目不存在' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTimelineDto,
  ): Promise<TimelineResponseDto> {
    return this.timelineService.update(id, dto);
  }

  @ApiOperation({ summary: '删除时间轴条目' })
  @ApiParam({ name: 'id', description: '条目 ID' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '条目不存在' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.timelineService.remove(id);
  }
}
