import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * 创建项目 DTO
 */
export class CreateProjectDto {
  @ApiProperty({
    description: '项目名称',
    example: 'My Blog Platform',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: '项目名称不能为空' })
  @MaxLength(200, { message: '项目名称长度不能超过200字符' })
  title: string;

  @ApiProperty({
    description: '项目描述',
    example: '一个基于 NestJS + Next.js 的博客平台',
  })
  @IsString()
  @IsNotEmpty({ message: '项目描述不能为空' })
  description: string;

  @ApiPropertyOptional({
    description: '技术栈列表',
    example: ['NestJS', 'Next.js', 'PostgreSQL'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  techStack?: string[];

  @ApiPropertyOptional({
    description: '封面图片 URL',
    example: 'https://example.com/project-cover.jpg',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '封面图片URL长度不能超过500字符' })
  coverImage?: string;

  @ApiPropertyOptional({
    description: '项目链接',
    example: 'https://my-blog.com',
  })
  @IsOptional()
  @IsUrl({}, { message: '项目链接必须是有效的 URL' })
  link?: string;

  @ApiPropertyOptional({
    description: 'GitHub 仓库地址',
    example: 'https://github.com/user/repo',
  })
  @IsOptional()
  @IsUrl({}, { message: 'GitHub 地址必须是有效的 URL' })
  githubUrl?: string;

  @ApiPropertyOptional({
    description: '是否精选',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({
    description: '排序权重（越小越靠前）',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: '排序权重必须是整数' })
  @Min(0, { message: '排序权重不能为负数' })
  order?: number;
}
