import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { UploadMediaDto, QueryMediaDto, MediaResponseDto, PaginatedMediaListDto } from './dto';
import { StorageType } from './domain/media.model';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Express Multer 文件类型
 */
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

/**
 * 媒体管理控制器
 */
@ApiTags('媒体管理')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'admin/media', version: '1' })
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @ApiOperation({ summary: '上传媒体文件', description: '上传图片、视频等媒体文件' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '要上传的文件',
        },
        alt: {
          type: 'string',
          description: '图片 alt 文本',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: '上传成功', type: MediaResponseDto })
  @ApiResponse({ status: 400, description: '未选择文件或文件格式不支持' })
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: MulterFile,
    @Body() dto: UploadMediaDto,
  ): Promise<MediaResponseDto> {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    return this.mediaService.upload({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storageType: StorageType.LOCAL,
      storagePath: file.filename,
      alt: dto.alt,
    });
  }

  @ApiOperation({ summary: '获取媒体列表', description: '分页获取媒体文件列表' })
  @ApiResponse({ status: 200, description: '获取成功', type: PaginatedMediaListDto })
  @Get()
  async findAll(@Query() query: QueryMediaDto): Promise<PaginatedMediaListDto> {
    return this.mediaService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      mediaType: query.mediaType,
    });
  }

  @ApiOperation({ summary: '获取媒体详情', description: '根据 ID 获取媒体文件详细信息' })
  @ApiParam({ name: 'id', description: '媒体 ID' })
  @ApiResponse({ status: 200, description: '获取成功', type: MediaResponseDto })
  @ApiResponse({ status: 404, description: '媒体不存在' })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<MediaResponseDto> {
    return this.mediaService.findOne(id);
  }

  @ApiOperation({ summary: '删除媒体文件', description: '删除指定媒体文件' })
  @ApiParam({ name: 'id', description: '媒体 ID' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: '媒体不存在' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.mediaService.remove(id);
  }
}
