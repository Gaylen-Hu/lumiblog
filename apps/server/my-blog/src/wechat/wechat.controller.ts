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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
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

@ApiTags('微信公众号')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'wechat', version: '1' })
@UseGuards(JwtAuthGuard)
export class WechatController {
  constructor(private readonly wechatService: WechatService) {}

  // ============ 素材管理 ============

  @ApiOperation({ summary: '获取素材数量', description: '获取公众号各类型素材的数量统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @Get('material/count')
  async getMaterialCount() {
    return this.wechatService.getMaterialCount();
  }

  @ApiOperation({ summary: '获取素材列表', description: '分页获取指定类型的素材列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @Get('material/list')
  async getMaterialList(@Query() query: MaterialPaginationDto) {
    return this.wechatService.getMaterialList(
      query.type,
      query.offset,
      query.count,
    );
  }

  @ApiOperation({ summary: '删除素材', description: '删除指定的永久素材' })
  @ApiParam({ name: 'mediaId', description: '素材 media_id' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @Delete('material/:mediaId')
  async deleteMaterial(@Param('mediaId') mediaId: string) {
    await this.wechatService.deleteMaterial(mediaId);
    return { success: true };
  }

  // ============ 草稿箱 ============

  @ApiOperation({ summary: '新建草稿', description: '创建新的图文草稿' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @Post('draft')
  async createDraft(@Body() dto: CreateDraftDto) {
    return this.wechatService.createDraft(dto.articles);
  }

  @ApiOperation({ summary: '获取草稿', description: '根据 media_id 获取草稿内容' })
  @ApiParam({ name: 'mediaId', description: '草稿 media_id' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @Get('draft/:mediaId')
  async getDraft(@Param('mediaId') mediaId: string) {
    return this.wechatService.getDraft(mediaId);
  }

  @ApiOperation({ summary: '删除草稿', description: '删除指定草稿' })
  @ApiParam({ name: 'mediaId', description: '草稿 media_id' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @Delete('draft/:mediaId')
  async deleteDraft(@Param('mediaId') mediaId: string) {
    await this.wechatService.deleteDraft(mediaId);
    return { success: true };
  }

  @ApiOperation({ summary: '更新草稿', description: '更新草稿中的指定文章' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @Post('draft/update')
  async updateDraft(@Body() dto: UpdateDraftDto) {
    await this.wechatService.updateDraft(dto.mediaId, dto.index, dto.article);
    return { success: true };
  }

  @ApiOperation({ summary: '获取草稿数量', description: '获取草稿箱中的草稿总数' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @Get('draft/count')
  async getDraftCount() {
    return this.wechatService.getDraftCount();
  }

  @ApiOperation({ summary: '获取草稿列表', description: '分页获取草稿列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @Get('drafts')
  async getDraftList(@Query() query: DraftPaginationDto) {
    return this.wechatService.getDraftList(
      query.offset,
      query.count,
      query.noContent,
    );
  }


  // ============ 发布能力 ============

  @ApiOperation({ summary: '发布草稿', description: '将草稿发布为正式文章' })
  @ApiResponse({ status: 200, description: '发布成功' })
  @Post('publish')
  async publishDraft(@Body() dto: FreepublishSubmitDto) {
    return this.wechatService.publishDraft(dto.mediaId);
  }

  @ApiOperation({ summary: '获取发布状态', description: '查询发布任务的状态' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @Get('publish/status')
  async getPublishStatus(@Query() query: FreepublishGetDto) {
    return this.wechatService.getPublishStatus(query.publishId);
  }

  @ApiOperation({ summary: '删除已发布文章', description: '删除已发布的文章' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @Delete('publish')
  async deletePublish(@Body() dto: FreepublishDeleteDto) {
    await this.wechatService.deletePublish(dto.articleId, dto.index);
    return { success: true };
  }

  @ApiOperation({ summary: '获取已发布文章', description: '根据 article_id 获取已发布的文章' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @Get('publish/article')
  async getPublishedArticle(@Query() query: FreepublishGetArticleDto) {
    return this.wechatService.getPublishedArticle(query.articleId);
  }

  @ApiOperation({ summary: '获取已发布文章列表', description: '分页获取已发布的文章列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @Get('publish/list')
  async getPublishedList(@Query() query: FreepublishPaginationDto) {
    return this.wechatService.getPublishedList(
      query.offset,
      query.count,
      query.noContent,
    );
  }

  // ============ 数据分析 ============

  @ApiOperation({ summary: '获取接口分析数据', description: '获取公众号接口调用统计数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @Get('interface-summary')
  async getInterfaceSummary(@Query() query: DateRangeDto) {
    return this.wechatService.getInterfaceSummary(query.beginDate, query.endDate);
  }

  @ApiOperation({ summary: '获取用户增减数据', description: '获取用户增减统计数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @Get('user-summary')
  async getUserSummary(@Query() query: DateRangeDto) {
    return this.wechatService.getUserSummary(query.beginDate, query.endDate);
  }

  @ApiOperation({ summary: '获取累计用户数据', description: '获取累计用户统计数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @Get('user-cumulate')
  async getUserCumulate(@Query() query: DateRangeDto) {
    return this.wechatService.getUserCumulate(query.beginDate, query.endDate);
  }

  @ApiOperation({ summary: '获取图文分析数据', description: '获取图文阅读统计数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @Get('article-summary')
  async getArticleSummary(@Query() query: DateRangeDto) {
    return this.wechatService.getArticleSummary(query.beginDate, query.endDate);
  }

  @ApiOperation({ summary: '获取消息分析数据', description: '获取用户消息统计数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @Get('upstream-msg')
  async getUpstreamMsg(@Query() query: DateRangeDto) {
    return this.wechatService.getUpstreamMsg(query.beginDate, query.endDate);
  }
}
