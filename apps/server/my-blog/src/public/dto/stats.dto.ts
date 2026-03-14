import { ApiProperty } from '@nestjs/swagger';

export class SiteStatsDto {
  @ApiProperty({ description: '已发布文章总数', example: 50 })
  readonly articleCount: number;

  @ApiProperty({ description: '项目经验年数', example: 8 })
  readonly yearsOfExperience: number;

  @ApiProperty({ description: '开源贡献数', example: 200 })
  readonly openSourceCount: number;

  @ApiProperty({ description: '技术分享数', example: 30 })
  readonly talkCount: number;

  constructor(params: {
    articleCount: number;
    yearsOfExperience: number;
    openSourceCount: number;
    talkCount: number;
  }) {
    this.articleCount = params.articleCount;
    this.yearsOfExperience = params.yearsOfExperience;
    this.openSourceCount = params.openSourceCount;
    this.talkCount = params.talkCount;
  }
}
