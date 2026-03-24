import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsInt, Min, IsArray } from 'class-validator';

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

  @ApiPropertyOptional({ description: '统计代码（旧字段）' })
  @IsOptional()
  @IsString()
  analytics?: string;

  @ApiPropertyOptional({ description: 'Google Analytics Measurement ID，如 G-XXXXXXXXXX' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  analyticsGoogle?: string;

  @ApiPropertyOptional({ description: '百度统计 site key' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  analyticsBaidu?: string;

  @ApiPropertyOptional({ description: '站长名称' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ownerName?: string;

  @ApiPropertyOptional({ description: '站长头像 URL' })
  @IsOptional()
  @IsString()
  ownerAvatar?: string;

  @ApiPropertyOptional({ description: '站长简介' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  ownerBio?: string;

  @ApiPropertyOptional({ description: '站长邮箱' })
  @IsOptional()
  @IsString()
  ownerEmail?: string;

  @ApiPropertyOptional({ description: '技术栈列表', type: [String] })
  @IsOptional()
  @IsString({ each: true })
  ownerTechStack?: string[];

  @ApiPropertyOptional({ description: '项目经验年数' })
  @IsOptional()
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @ApiPropertyOptional({ description: '开源贡献数' })
  @IsOptional()
  @IsInt()
  @Min(0)
  openSourceCount?: number;

  @ApiPropertyOptional({ description: '技术分享数' })
  @IsOptional()
  @IsInt()
  @Min(0)
  talkCount?: number;

  @ApiPropertyOptional({ description: 'GitHub 链接' })
  @IsOptional()
  @IsString()
  socialGithub?: string;

  @ApiPropertyOptional({ description: 'Twitter 链接' })
  @IsOptional()
  @IsString()
  socialTwitter?: string;

  @ApiPropertyOptional({ description: 'LinkedIn 链接' })
  @IsOptional()
  @IsString()
  socialLinkedin?: string;

  @ApiPropertyOptional({ description: '微博链接' })
  @IsOptional()
  @IsString()
  socialWeibo?: string;

  @ApiPropertyOptional({ description: 'About 页面图片1 URL' })
  @IsOptional()
  @IsString()
  aboutImage1?: string;

  @ApiPropertyOptional({ description: 'About 页面图片2 URL' })
  @IsOptional()
  @IsString()
  aboutImage2?: string;
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

  @ApiPropertyOptional({ description: '统计代码（旧字段）' })
  analytics: string | null;

  @ApiPropertyOptional({ description: 'Google Analytics Measurement ID' })
  analyticsGoogle: string | null;

  @ApiPropertyOptional({ description: '百度统计 site key' })
  analyticsBaidu: string | null;

  @ApiPropertyOptional({ description: '站长名称' })
  ownerName: string | null;

  @ApiPropertyOptional({ description: '站长头像 URL' })
  ownerAvatar: string | null;

  @ApiPropertyOptional({ description: '站长简介' })
  ownerBio: string | null;

  @ApiPropertyOptional({ description: '站长邮箱' })
  ownerEmail: string | null;

  @ApiPropertyOptional({ description: '技术栈列表', type: [String] })
  ownerTechStack: string[];

  @ApiPropertyOptional({ description: '项目经验年数' })
  yearsOfExperience: number | null;

  @ApiPropertyOptional({ description: '开源贡献数' })
  openSourceCount: number | null;

  @ApiPropertyOptional({ description: '技术分享数' })
  talkCount: number | null;

  @ApiPropertyOptional({ description: 'GitHub 链接' })
  socialGithub: string | null;

  @ApiPropertyOptional({ description: 'Twitter 链接' })
  socialTwitter: string | null;

  @ApiPropertyOptional({ description: 'LinkedIn 链接' })
  socialLinkedin: string | null;

  @ApiPropertyOptional({ description: '微博链接' })
  socialWeibo: string | null;

  @ApiPropertyOptional({ description: 'About 页面图片1 URL' })
  aboutImage1: string | null;

  @ApiPropertyOptional({ description: 'About 页面图片2 URL' })
  aboutImage2: string | null;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}
