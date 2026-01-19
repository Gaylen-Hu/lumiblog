/**
 * SEO 元数据响应 DTO
 */
export class SeoMetaResponseDto {
  readonly title: string;
  readonly description: string;
  readonly keywords: string[];
  readonly canonical: string | null;
  readonly ogTitle: string | null;
  readonly ogDescription: string | null;
  readonly ogImage: string | null;
  readonly noIndex: boolean;
  readonly noFollow: boolean;

  constructor(params: {
    title: string;
    description: string;
    keywords: string[];
    canonical: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    noIndex: boolean;
    noFollow: boolean;
  }) {
    this.title = params.title;
    this.description = params.description;
    this.keywords = params.keywords;
    this.canonical = params.canonical;
    this.ogTitle = params.ogTitle;
    this.ogDescription = params.ogDescription;
    this.ogImage = params.ogImage;
    this.noIndex = params.noIndex;
    this.noFollow = params.noFollow;
  }
}
