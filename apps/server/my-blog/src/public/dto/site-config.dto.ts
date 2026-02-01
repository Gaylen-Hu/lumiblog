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

  constructor(params: {
    name: string;
    avatar: string | null;
    bio: string | null;
    email: string | null;
  }) {
    this.name = params.name;
    this.avatar = params.avatar;
    this.bio = params.bio;
    this.email = params.email;
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

  @ApiPropertyOptional({ description: '默认 OG 图片' })
  readonly defaultOgImage: string | null;

  constructor(params: {
    defaultTitle: string | null;
    defaultDescription: string | null;
    defaultOgImage: string | null;
  }) {
    this.defaultTitle = params.defaultTitle;
    this.defaultDescription = params.defaultDescription;
    this.defaultOgImage = params.defaultOgImage;
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

  constructor(params: {
    siteName: string;
    siteDescription: string;
    logo: string | null;
    favicon: string | null;
    socialLinks: SocialLinksDto;
    owner: SiteOwnerDto;
    seo: SiteSeoDto;
  }) {
    this.siteName = params.siteName;
    this.siteDescription = params.siteDescription;
    this.logo = params.logo;
    this.favicon = params.favicon;
    this.socialLinks = params.socialLinks;
    this.owner = params.owner;
    this.seo = params.seo;
  }
}
