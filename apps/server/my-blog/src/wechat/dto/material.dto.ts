import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn } from 'class-validator';

/**
 * 素材类型
 */
export type MaterialType = 'image' | 'voice' | 'video' | 'thumb' | 'news';

/**
 * 素材分页查询 DTO
 */
export class MaterialPaginationDto {
  @IsString()
  @IsIn(['image', 'voice', 'video', 'news'])
  type: MaterialType;

  @IsNumber()
  @IsOptional()
  offset?: number = 0;

  @IsNumber()
  @IsOptional()
  count?: number = 20;
}

/**
 * 获取素材 DTO
 */
export class GetMaterialDto {
  @IsString()
  @IsNotEmpty({ message: 'media_id 不能为空' })
  mediaId: string;
}

/**
 * 删除素材 DTO
 */
export class DeleteMaterialDto {
  @IsString()
  @IsNotEmpty({ message: 'media_id 不能为空' })
  mediaId: string;
}
