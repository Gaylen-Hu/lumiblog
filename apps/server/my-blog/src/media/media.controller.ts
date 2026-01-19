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
@Controller('admin/media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

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

  @Get()
  async findAll(@Query() query: QueryMediaDto): Promise<PaginatedMediaListDto> {
    return this.mediaService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      mediaType: query.mediaType,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<MediaResponseDto> {
    return this.mediaService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.mediaService.remove(id);
  }
}
