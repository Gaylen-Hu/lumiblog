import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';

/**
 * 更新分类 DTO
 * 不允许修改 parentId（避免循环引用）
 */
export class UpdateCategoryDto extends PartialType(
  OmitType(CreateCategoryDto, ['parentId'] as const),
) {}
