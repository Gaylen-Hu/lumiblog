import { PartialType } from '@nestjs/swagger';
import { CreateTagDto } from './create-tag.dto';

/**
 * 更新标签 DTO
 */
export class UpdateTagDto extends PartialType(CreateTagDto) {}
