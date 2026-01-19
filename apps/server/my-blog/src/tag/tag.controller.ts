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
import { TagService } from './tag.service';
import { CreateTagDto, UpdateTagDto, TagResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * 标签管理控制器（管理端）
 */
@Controller('admin/tags')
@UseGuards(JwtAuthGuard)
export class AdminTagController {
  constructor(private readonly tagService: TagService) {}

  @Post()
  async create(@Body() dto: CreateTagDto): Promise<TagResponseDto> {
    return this.tagService.create(dto);
  }

  @Get()
  async findAll(): Promise<TagResponseDto[]> {
    return this.tagService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<TagResponseDto> {
    return this.tagService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTagDto,
  ): Promise<TagResponseDto> {
    return this.tagService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.tagService.remove(id);
  }
}

/**
 * 标签公开控制器（C端）
 */
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  async findAll(): Promise<TagResponseDto[]> {
    return this.tagService.findAll();
  }

  @Get('popular')
  async findPopular(@Query('limit') limit?: string): Promise<TagResponseDto[]> {
    return this.tagService.findPopular(limit ? parseInt(limit, 10) : 10);
  }
}
