import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/** 默认分页大小 */
const DEFAULT_PAGE_SIZE = 10;
/** 最大分页大小 */
const MAX_PAGE_SIZE = 100;

/**
 * 查询 Timeline 列表 DTO
 */
export class QueryTimelineDto {
  @ApiPropertyOptional({
    description: '页码',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码最小为 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
    default: DEFAULT_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量最小为 1' })
  @Max(MAX_PAGE_SIZE, { message: `每页数量最大为 ${MAX_PAGE_SIZE}` })
  limit?: number = DEFAULT_PAGE_SIZE;
}
