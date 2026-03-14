import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 社交链接 DTO
 */
export class SocialLinksDto {
  @ApiPropertyOptional({ description: 'GitHub 链接' })
  readonly github?: string;

  @ApiPropertyOptional({ description: 'Twitter 链接' })
  readonly twitter?: string;

  @ApiPropertyOptional({ description: 'LinkedIn 链接' })
  readonly linkedin?: string;

  @ApiPropertyOptional({ description: '微博链接' })
  readonly weibo?: string;

  constructor(params: {
    github?: string;
    twitter?: string;
    linkedin?: string;
    weibo?: string;
  }) {
    this.github = params.github;
    this.twitter = params.twitter;
    this.linkedin = params.linkedin;
    this.weibo = params.weibo;
  }
}

/**
 * 站点所有者信息 DTO
 */
export class SiteOwnerDto {
  @ApiProperty({ description: '所有者名称', example: 'John Doe' })
  readonly name: string;

  @ApiPropertyOptional({ description: '头像 URL' })
  readonly avatar: string | null;

  @ApiPropertyOptional({ description: '个人简介' })
  readonly bio: string | null;

  @ApiPropertyOptional({ description: '邮箱' })
  readonly email: string | null;

  @ApiProperty({ description: '技术栈列表', type: [String] })
  readonly techStack: string[];

  constructor(params: {
    name: string;
    avatar: string | null;
    bio: string | null;
    email: string | null;
    techStack: string[];
  }) {
    this.name = params.name;
    this.avatar = params.avatar;
    this.bio = params.bio;
    this.email = params.email;
    this.techStack = params.techStack;
  }
}

/**
 * 站点 SEO 配置 DTO
 */
export class SiteSeoDto {
  @ApiPropertyOptional({ description: '默认标题' })
  readonly defaultTitle: string | null;

  @ApiPropertyOptional({ description: '默认描述' })
  readonly defaultDescription: string | null;

  @ApiPropertyOptional({ description: '关键词' })
  readonly keywords: string | null;

  @ApiPropertyOptional({ description: '默认 OG 图片' })
  readonly defaultOgImage: string | null;

  constructor(params: {
    defaultTitle: string | null;
    defaultDescription: string | null;
    keywords?: string | null;
    defaultOgImage: string | null;
  }) {
    this.defaultTitle = params.defaultTitle;
    this.defaultDescription = params.defaultDescription;
    this.keywords = params.keywords ?? null;
    this.defaultOgImage = params.defaultOgImage;
  }
}

/**
 * 备案信息 DTO
 */
export class FilingInfoDto {
  @ApiPropertyOptional({ description: 'ICP 备案号' })
  readonly icp: string | null;

  @ApiPropertyOptional({ description: '公安备案号' })
  readonly gongan: string | null;

  @ApiPropertyOptional({ description: '版权信息' })
  readonly copyright: string | null;

  constructor(params: {
    icp: string | null;
    gongan: string | null;
    copyright: string | null;
  }) {
    this.icp = params.icp;
    this.gongan = params.gongan;
    this.copyright = params.copyright;
  }
}

/**
 * 站点配置响应 DTO
 */
export class SiteConfigDto {
  @ApiProperty({ description: '站点名称', example: 'NOVA' })
  readonly siteName: string;

  @ApiProperty({ description: '站点描述', example: '探索技术与设计的前沿' })
  readonly siteDescription: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  readonly logo: string | null;

  @ApiPropertyOptional({ description: 'Favicon URL' })
  readonly favicon: string | null;

  @ApiProperty({ description: '社交链接', type: SocialLinksDto })
  readonly socialLinks: SocialLinksDto;

  @ApiProperty({ description: '站点所有者信息', type: SiteOwnerDto })
  readonly owner: SiteOwnerDto;

  @ApiProperty({ description: 'SEO 配置', type: SiteSeoDto })
  readonly seo: SiteSeoDto;

  @ApiProperty({ description: '备案信息', type: FilingInfoDto })
  readonly filing: FilingInfoDto;

  @ApiPropertyOptional({ description: 'Google Analytics Measurement ID，如 G-XXXXXXXXXX' })
  readonly analyticsGoogle: string | null;

  @ApiPropertyOptional({ description: '百度统计 site key' })
  readonly analyticsBaidu: string | null;

  constructor(params: {
    siteName: string;
    siteDescription: string;
    logo: string | null;
    favicon: string | null;
    socialLinks: SocialLinksDto;
    owner: SiteOwnerDto;
    seo: SiteSeoDto;
    filing: FilingInfoDto;
    analyticsGoogle?: string | null;
    analyticsBaidu?: string | null;
  }) {
    this.siteName = params.siteName;
    this.siteDescription = params.siteDescription;
    this.logo = params.logo;
    this.favicon = params.favicon;
    this.socialLinks = params.socialLinks;
    this.owner = params.owner;
    this.seo = params.seo;
    this.filing = params.filing;
    this.analyticsGoogle = params.analyticsGoogle ?? null;
    this.analyticsBaidu = params.analyticsBaidu ?? null;
  }
}
