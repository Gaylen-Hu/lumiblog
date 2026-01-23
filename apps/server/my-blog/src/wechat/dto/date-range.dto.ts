import { IsString, IsNotEmpty, Matches } from 'class-validator';

/**
 * 日期范围查询 DTO
 * 用于微信数据分析接口的日期参数
 */
export class DateRangeDto {
  @IsString()
  @IsNotEmpty({ message: '起始日期不能为空' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '起始日期格式必须为 YYYY-MM-DD' })
  beginDate: string;

  @IsString()
  @IsNotEmpty({ message: '结束日期不能为空' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '结束日期格式必须为 YYYY-MM-DD' })
  endDate: string;
}
