import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Prisma, Project } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectResponseDto, PaginatedProjectListDto } from './dto';

/** 创建项目参数 */
interface CreateProjectParams {
  title: string;
  description: string;
  techStack?: string[];
  coverImage?: string;
  link?: string;
  githubUrl?: string;
  featured?: boolean;
  order?: number;
}

/** 更新项目参数 */
interface UpdateProjectParams {
  title?: string;
  description?: string;
  techStack?: string[];
  coverImage?: string;
  link?: string;
  githubUrl?: string;
  featured?: boolean;
  order?: number;
}

/** 查询项目参数 */
interface QueryProjectParams {
  page: number;
  limit: number;
  featured?: boolean;
}

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateProjectParams): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.create({
      data: {
        title: params.title,
        description: params.description,
        techStack: params.techStack ?? [],
        coverImage: params.coverImage ?? null,
        link: params.link ?? null,
        githubUrl: params.githubUrl ?? null,
        featured: params.featured ?? false,
        order: params.order ?? 0,
      },
    });

    this.logger.log(`项目创建成功: ${project.id}`);
    return this.toResponseDto(project);
  }

  async findAll(params: QueryProjectParams): Promise<PaginatedProjectListDto> {
    const where: Prisma.ProjectWhereInput = {};
    if (params.featured !== undefined) {
      where.featured = params.featured;
    }

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        orderBy: { order: 'asc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return new PaginatedProjectListDto({
      data: items.map((p) => this.toResponseDto(p)),
      total,
      page: params.page,
      limit: params.limit,
    });
  }

  async findOne(id: string): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundException('项目不存在');
    }
    return this.toResponseDto(project);
  }

  async update(
    id: string,
    params: UpdateProjectParams,
  ): Promise<ProjectResponseDto> {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('项目不存在');
    }

    const project = await this.prisma.project.update({
      where: { id },
      data: {
        title: params.title,
        description: params.description,
        techStack: params.techStack,
        coverImage: params.coverImage,
        link: params.link,
        githubUrl: params.githubUrl,
        featured: params.featured,
        order: params.order,
      },
    });

    this.logger.log(`项目更新成功: ${id}`);
    return this.toResponseDto(project);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('项目不存在');
    }

    await this.prisma.project.delete({ where: { id } });
    this.logger.log(`项目删除成功: ${id}`);
  }

  private toResponseDto(project: Project): ProjectResponseDto {
    return new ProjectResponseDto({
      id: project.id,
      title: project.title,
      description: project.description,
      techStack: project.techStack,
      coverImage: project.coverImage,
      link: project.link,
      githubUrl: project.githubUrl,
      featured: project.featured,
      order: project.order,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  }
}
