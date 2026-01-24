import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

/**
 * 日期范围查询 DTO
 * 用于微信数据分析接口的日期参数
 */
export class DateRangeDto {
  @ApiProperty({
    description: '起始日期',
    example: '2024-01-01',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsString()
  @IsNotEmpty({ message: '起始日期不能为空' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '起始日期格式必须为 YYYY-MM-DD' })
  beginDate: string;

  @ApiProperty({
    description: '结束日期',
    example: '2024-01-31',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsString()
  @IsNotEmpty({ message: '结束日期不能为空' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '结束日期格式必须为 YYYY-MM-DD' })
  endDate: string;
}
