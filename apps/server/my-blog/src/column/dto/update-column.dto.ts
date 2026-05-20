import { PartialType } from '@nestjs/swagger';
import { CreateColumnDto } from './create-column.dto';

/**
 * 更新专栏 DTO（所有字段可选）
 */
export class UpdateColumnDto extends PartialType(CreateColumnDto) {}
