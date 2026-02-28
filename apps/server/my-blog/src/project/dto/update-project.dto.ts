import { PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';

/**
 * 更新项目 DTO
 * 所有字段均为可选
 */
export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
