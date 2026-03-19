import { PartialType } from '@nestjs/mapped-types';
import { CreateTimelineDto } from './create-timeline.dto';

/**
 * 更新 Timeline 条目 DTO
 * 所有字段均为可选
 */
export class UpdateTimelineDto extends PartialType(CreateTimelineDto) {}
