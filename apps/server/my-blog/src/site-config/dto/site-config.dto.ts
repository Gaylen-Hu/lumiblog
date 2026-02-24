import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateSiteConfigDto {
  @ApiPropertyOptional({ description: '网站标题', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  title?: string;

  @ApiPropertyOptional({ description: '网站描述', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ description: '关键词，逗号分隔', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  keywords?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ description: 'Favicon URL' })
  @IsOptional()
  @IsString()
  favicon?: string;

  @ApiPropertyOptional({ description: 'ICP 备案号' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icp?: string;

  @ApiPropertyOptional({ description: '公安备案号' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  gongan?: string;

  @ApiPropertyOptional({ description: '版权信息' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  copyright?: string;

  @ApiPropertyOptional({ description: '统计代码' })
  @IsOptional()
  @IsString()
  analytics?: string;
}

export class SiteConfigResponseDto {
  @ApiProperty({ description: '配置 ID' })
  id: string;

  @ApiProperty({ description: '网站标题' })
  title: string;

  @ApiPropertyOptional({ description: '网站描述' })
  description: string | null;

  @ApiPropertyOptional({ description: '关键词' })
  keywords: string | null;

  @ApiPropertyOptional({ description: 'Logo URL' })
  logo: string | null;

  @ApiPropertyOptional({ description: 'Favicon URL' })
  favicon: string | null;

  @ApiPropertyOptional({ description: 'ICP 备案号' })
  icp: string | null;

  @ApiPropertyOptional({ description: '公安备案号' })
  gongan: string | null;

  @ApiPropertyOptional({ description: '版权信息' })
  copyright: string | null;

  @ApiPropertyOptional({ description: '统计代码' })
  analytics: string | null;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}
