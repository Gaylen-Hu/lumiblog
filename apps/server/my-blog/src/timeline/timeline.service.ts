import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { TimelineEntry } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  TimelineResponseDto,
  PublicTimelineResponseDto,
  PaginatedTimelineListDto,
} from './dto';

/** 创建时间轴条目参数 */
interface CreateTimelineParams {
  year: string;
  titleZh: string;
  titleEn: string;
  descZh: string;
  descEn: string;
  order: number;
  isVisible: boolean;
}

/** 更新时间轴条目参数 */
interface UpdateTimelineParams {
  year?: string;
  titleZh?: string;
  titleEn?: string;
  descZh?: string;
  descEn?: string;
  order?: number;
  isVisible?: boolean;
}

/** 查询时间轴条目参数 */
interface QueryTimelineParams {
  page: number;
  limit: number;
}

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateTimelineParams): Promise<TimelineResponseDto> {
    const entry = await this.prisma.timelineEntry.create({
      data: {
        year: params.year,
        titleZh: params.titleZh,
        titleEn: params.titleEn,
        descZh: params.descZh,
        descEn: params.descEn,
        order: params.order,
        isVisible: params.isVisible,
      },
    });

    this.logger.log(`时间轴条目创建成功: ${entry.id}`);
    return this.toResponseDto(entry);
  }

  async findAll(params: QueryTimelineParams): Promise<PaginatedTimelineListDto> {
    const [items, total] = await Promise.all([
      this.prisma.timelineEntry.findMany({
        orderBy: { order: 'asc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.timelineEntry.count(),
    ]);

    return new PaginatedTimelineListDto({
      data: items.map((e) => this.toResponseDto(e)),
      total,
      page: params.page,
      limit: params.limit,
    });
  }

  async findOne(id: string): Promise<TimelineResponseDto> {
    const entry = await this.prisma.timelineEntry.findUnique({ where: { id } });
    if (!entry) {
      throw new NotFoundException('时间轴条目不存在');
    }
    return this.toResponseDto(entry);
  }

  async update(
    id: string,
    params: UpdateTimelineParams,
  ): Promise<TimelineResponseDto> {
    const existing = await this.prisma.timelineEntry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('时间轴条目不存在');
    }

    const entry = await this.prisma.timelineEntry.update({
      where: { id },
      data: {
        year: params.year,
        titleZh: params.titleZh,
        titleEn: params.titleEn,
        descZh: params.descZh,
        descEn: params.descEn,
        order: params.order,
        isVisible: params.isVisible,
      },
    });

    this.logger.log(`时间轴条目更新成功: ${id}`);
    return this.toResponseDto(entry);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.timelineEntry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('时间轴条目不存在');
    }

    await this.prisma.timelineEntry.delete({ where: { id } });
    this.logger.log(`时间轴条目删除成功: ${id}`);
  }

  async findPublished(): Promise<PublicTimelineResponseDto[]> {
    const entries = await this.prisma.timelineEntry.findMany({
      where: { isVisible: true },
      orderBy: { order: 'asc' },
    });

    return entries.map((e) => this.toPublicResponseDto(e));
  }

  private toResponseDto(entry: TimelineEntry): TimelineResponseDto {
    return new TimelineResponseDto({
      id: entry.id,
      year: entry.year,
      titleZh: entry.titleZh,
      titleEn: entry.titleEn,
      descZh: entry.descZh,
      descEn: entry.descEn,
      order: entry.order,
      isVisible: entry.isVisible,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    });
  }

  private toPublicResponseDto(entry: TimelineEntry): PublicTimelineResponseDto {
    return new PublicTimelineResponseDto({
      id: entry.id,
      year: entry.year,
      titleZh: entry.titleZh,
      titleEn: entry.titleEn,
      descZh: entry.descZh,
      descEn: entry.descEn,
      order: entry.order,
    });
  }
}
