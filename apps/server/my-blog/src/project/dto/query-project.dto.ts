import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/** 默认分页大小 */
const DEFAULT_PAGE_SIZE = 10;
/** 最大分页大小 */
const MAX_PAGE_SIZE = 100;

/**
 * 查询项目列表 DTO
 */
export class QueryProjectDto {
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
    example: 10,
    default: 10,
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
    description: '是否精选筛选',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean({ message: 'featured 必须是布尔值' })
  featured?: boolean;
}
