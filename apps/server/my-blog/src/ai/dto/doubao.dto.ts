import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

/**
 * 豆包对话请求 DTO
 */
export class DoubaoPromptDto {
  @ApiProperty({
    description: '用户提示词',
    example: '请帮我总结这篇文章的要点',
  })
  @IsString()
  @IsNotEmpty({ message: '提示词不能为空' })
  prompt: string;

  @ApiPropertyOptional({
    description: '系统提示词（可选）',
    example: '你是一个专业的技术文章助手',
  })
  @IsOptional()
  @IsString()
  systemPrompt?: string;
}

/**
 * 豆包多模态请求 DTO（支持图片）
 */
export class DoubaoImagePromptDto {
  @ApiProperty({
    description: '用户提示词',
    example: '你看见了什么？',
  })
  @IsString()
  @IsNotEmpty({ message: '提示词不能为空' })
  prompt: string;

  @ApiProperty({
    description: '图片 URL',
    example: 'https://example.com/image.png',
  })
  @IsUrl({}, { message: '图片 URL 格式不正确' })
  @IsNotEmpty({ message: '图片 URL 不能为空' })
  imageUrl: string;

  @ApiPropertyOptional({
    description: '系统提示词（可选）',
  })
  @IsOptional()
  @IsString()
  systemPrompt?: string;
}

/**
 * 豆包响应 DTO
 */
export class DoubaoResponseDto {
  @ApiProperty({ description: 'AI 返回的文本内容' })
  content: string;

  constructor(content: string) {
    this.content = content;
  }
}
