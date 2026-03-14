import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { User as PrismaUser, UserRole as PrismaUserRole } from '@prisma/client';

type SafeUser = Omit<PrismaUser, 'password'>;

/** 用户更新数据类型（排除不可直接更新的字段） */
type UserUpdateInput = {
  name?: string;
  email?: string;
  password?: string;
  avatar?: string;
  role?: PrismaUserRole;
};

@Injectable()
export class UserService implements OnModuleInit {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const adminEmail = this.configService.get<string>('ADMIN_DEFAULT_EMAIL', 'admin@example.com');
    const adminPassword = this.configService.get<string>('ADMIN_DEFAULT_PASSWORD');

    if (!adminPassword) {
      this.logger.warn('ADMIN_DEFAULT_PASSWORD 未配置，跳过默认管理员创建');
      return;
    }

    const existingAdmin = await this.prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await this.prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: '管理员',
          role: PrismaUserRole.ADMIN,
        },
      });
      this.logger.log(`默认管理员账号已创建: ${adminEmail}`);
    }
  }

  async create(createUserDto: CreateUserDto): Promise<SafeUser> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('该邮箱已被注册');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: hashedPassword,
        name: createUserDto.name,
        role: (createUserDto.role as unknown as PrismaUserRole) || PrismaUserRole.VIEWER,
        avatar: createUserDto.avatar,
      },
    });

    return this.excludePassword(user);
  }

  async findAll(query: QueryUserDto) {
    const where = {
      ...(query.keyword && {
        OR: [
          { name: { contains: query.keyword, mode: 'insensitive' as const } },
          { email: { contains: query.keyword, mode: 'insensitive' as const } },
        ],
      }),
      ...(query.role && { role: query.role as unknown as PrismaUserRole }),
    };

    const [total, data] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: ((query.page || 1) - 1) * (query.limit || 10),
        take: query.limit || 10,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      data,
      total,
      page: query.page || 1,
      limit: query.limit || 10,
    };
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return this.excludePassword(user);
  }

  async findByEmail(email: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<SafeUser> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('用户不存在');
    }

    if (updateUserDto.email) {
      const duplicateUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (duplicateUser && duplicateUser.id !== id) {
        throw new ConflictException('该邮箱已被使用');
      }
    }

    const updateData: UserUpdateInput = {};

    if (updateUserDto.name !== undefined) updateData.name = updateUserDto.name;
    if (updateUserDto.email !== undefined) updateData.email = updateUserDto.email;
    if (updateUserDto.avatar !== undefined) updateData.avatar = updateUserDto.avatar;
    if (updateUserDto.role !== undefined) updateData.role = updateUserDto.role as unknown as PrismaUserRole;

    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return this.excludePassword(user);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('用户不存在');
    }
    await this.prisma.user.delete({ where: { id } });
  }

  excludePassword(user: PrismaUser): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...safeUser } = user;
    return safeUser;
  }
}
