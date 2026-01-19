import { PartialType } from '@nestjs/mapped-types';
import { CreateTagDto } from './create-tag.dto';

/**
 * 更新标签 DTO
 */
export class UpdateTagDto extends PartialType(CreateTagDto) {}
