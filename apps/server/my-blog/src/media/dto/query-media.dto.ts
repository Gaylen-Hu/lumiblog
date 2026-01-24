import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { MediaType } from '../domain/media.model';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * 查询媒体 DTO
 */
export class QueryMediaDto {
  @ApiPropertyOptional({
    description: '页码',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码最小为1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量最小为1' })
  @Max(MAX_PAGE_SIZE, { message: `每页数量最大为${MAX_PAGE_SIZE}` })
  limit?: number = DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({
    description: '媒体类型筛选',
    enum: MediaType,
    example: 'image',
  })
  @IsOptional()
  @IsEnum(MediaType, { message: '媒体类型无效' })
  mediaType?: MediaType;
}
