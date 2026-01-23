import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { User as PrismaUser, UserRole as PrismaUserRole } from '@prisma/client';

type SafeUser = Omit<PrismaUser, 'password'>;

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // 自动创建默认管理员账号
    const existingAdmin = await this.prisma.user.findUnique({
      where: { email: 'admin@example.com' },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await this.prisma.user.create({
        data: {
          email: 'admin@example.com',
          password: hashedPassword,
          name: '管理员',
          role: PrismaUserRole.ADMIN,
        },
      });
      console.log('✓ 默认管理员账号已创建 (数据库)');
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

    const updateData: any = { ...updateUserDto };

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
    await this.prisma.user.delete({
      where: { id },
    });
  }

  excludePassword(user: PrismaUser): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...safeUser } = user;
    return safeUser;
  }
}
