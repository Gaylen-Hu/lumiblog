import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn } from 'class-validator';

/**
 * 素材类型
 */
export type MaterialType = 'image' | 'voice' | 'video' | 'thumb' | 'news';

/**
 * 素材分页查询 DTO
 */
export class MaterialPaginationDto {
  @ApiProperty({
    description: '素材类型',
    enum: ['image', 'voice', 'video', 'news'],
    example: 'image',
  })
  @IsString()
  @IsIn(['image', 'voice', 'video', 'news'])
  type: MaterialType;

  @ApiPropertyOptional({ description: '偏移量', example: 0, default: 0 })
  @IsNumber()
  @IsOptional()
  offset?: number = 0;

  @ApiPropertyOptional({ description: '每页数量', example: 20, default: 20 })
  @IsNumber()
  @IsOptional()
  count?: number = 20;
}

/**
 * 获取素材 DTO
 */
export class GetMaterialDto {
  @ApiProperty({ description: '素材 media_id', example: 'xxx_media_id' })
  @IsString()
  @IsNotEmpty({ message: 'media_id 不能为空' })
  mediaId: string;
}

/**
 * 删除素材 DTO
 */
export class DeleteMaterialDto {
  @ApiProperty({ description: '素材 media_id', example: 'xxx_media_id' })
  @IsString()
  @IsNotEmpty({ message: 'media_id 不能为空' })
  mediaId: string;
}
