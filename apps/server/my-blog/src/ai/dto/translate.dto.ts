import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum TargetLanguage {
  EN = 'en',
  ZH = 'zh',
}

/**
 * 翻译请求 DTO
 */
export class TranslateDto {
  @IsString()
  @IsNotEmpty({ message: '标题不能为空' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: '内容不能为空' })
  content: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsEnum(TargetLanguage, { message: '目标语言必须是 en 或 zh' })
  targetLanguage?: TargetLanguage = TargetLanguage.EN;
}

/**
 * 翻译响应 DTO
 */
export class TranslateResponseDto {
  title: string;
  content: string;
  summary: string | null;
  targetLanguage: string;

  constructor(partial: Partial<TranslateResponseDto>) {
    Object.assign(this, partial);
  }
}
