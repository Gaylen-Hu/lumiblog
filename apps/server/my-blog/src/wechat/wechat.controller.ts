import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WechatService } from './wechat.service';
import { DateRangeDto } from './dto/date-range.dto';
import { CreateDraftDto, UpdateDraftDto, DraftPaginationDto } from './dto/draft.dto';
import { MaterialPaginationDto } from './dto/material.dto';
import {
  FreepublishSubmitDto,
  FreepublishGetDto,
  FreepublishDeleteDto,
  FreepublishGetArticleDto,
  FreepublishPaginationDto,
} from './dto/freepublish.dto';

@Controller('wechat')
@UseGuards(JwtAuthGuard)
export class WechatController {
  constructor(private readonly wechatService: WechatService) {}

  // ============ 素材管理 ============

  @Get('material/count')
  async getMaterialCount() {
    return this.wechatService.getMaterialCount();
  }

  @Get('material/list')
  async getMaterialList(@Query() query: MaterialPaginationDto) {
    return this.wechatService.getMaterialList(
      query.type,
      query.offset,
      query.count,
    );
  }

  @Delete('material/:mediaId')
  async deleteMaterial(@Param('mediaId') mediaId: string) {
    await this.wechatService.deleteMaterial(mediaId);
    return { success: true };
  }

  // ============ 草稿箱 ============

  @Post('draft')
  async createDraft(@Body() dto: CreateDraftDto) {
    return this.wechatService.createDraft(dto.articles);
  }

  @Get('draft/:mediaId')
  async getDraft(@Param('mediaId') mediaId: string) {
    return this.wechatService.getDraft(mediaId);
  }

  @Delete('draft/:mediaId')
  async deleteDraft(@Param('mediaId') mediaId: string) {
    await this.wechatService.deleteDraft(mediaId);
    return { success: true };
  }

  @Post('draft/update')
  async updateDraft(@Body() dto: UpdateDraftDto) {
    await this.wechatService.updateDraft(dto.mediaId, dto.index, dto.article);
    return { success: true };
  }

  @Get('draft/count')
  async getDraftCount() {
    return this.wechatService.getDraftCount();
  }

  @Get('drafts')
  async getDraftList(@Query() query: DraftPaginationDto) {
    return this.wechatService.getDraftList(
      query.offset,
      query.count,
      query.noContent,
    );
  }


  // ============ 发布能力 ============

  @Post('publish')
  async publishDraft(@Body() dto: FreepublishSubmitDto) {
    return this.wechatService.publishDraft(dto.mediaId);
  }

  @Get('publish/status')
  async getPublishStatus(@Query() query: FreepublishGetDto) {
    return this.wechatService.getPublishStatus(query.publishId);
  }

  @Delete('publish')
  async deletePublish(@Body() dto: FreepublishDeleteDto) {
    await this.wechatService.deletePublish(dto.articleId, dto.index);
    return { success: true };
  }

  @Get('publish/article')
  async getPublishedArticle(@Query() query: FreepublishGetArticleDto) {
    return this.wechatService.getPublishedArticle(query.articleId);
  }

  @Get('publish/list')
  async getPublishedList(@Query() query: FreepublishPaginationDto) {
    return this.wechatService.getPublishedList(
      query.offset,
      query.count,
      query.noContent,
    );
  }

  // ============ 数据分析 ============

  @Get('interface-summary')
  async getInterfaceSummary(@Query() query: DateRangeDto) {
    return this.wechatService.getInterfaceSummary(query.beginDate, query.endDate);
  }

  @Get('user-summary')
  async getUserSummary(@Query() query: DateRangeDto) {
    return this.wechatService.getUserSummary(query.beginDate, query.endDate);
  }

  @Get('user-cumulate')
  async getUserCumulate(@Query() query: DateRangeDto) {
    return this.wechatService.getUserCumulate(query.beginDate, query.endDate);
  }

  @Get('article-summary')
  async getArticleSummary(@Query() query: DateRangeDto) {
    return this.wechatService.getArticleSummary(query.beginDate, query.endDate);
  }

  @Get('upstream-msg')
  async getUpstreamMsg(@Query() query: DateRangeDto) {
    return this.wechatService.getUpstreamMsg(query.beginDate, query.endDate);
  }
}
