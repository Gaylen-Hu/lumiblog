import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

// TODO: 替换为 Prisma 生成的类型
export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type SafeUser = Omit<User, 'password'>;

@Injectable()
export class UserService {
  // TODO: 集成 Prisma 后替换为真实数据库操作
  private users: User[] = [];
  private idCounter = 1;

  async create(createUserDto: CreateUserDto): Promise<SafeUser> {
    const existingUser = this.users.find(
      (u) => u.email === createUserDto.email,
    );
    if (existingUser) {
      throw new ConflictException('该邮箱已被注册');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const now = new Date();

    const user: User = {
      id: String(this.idCounter++),
      email: createUserDto.email,
      password: hashedPassword,
      name: createUserDto.name,
      role: createUserDto.role || UserRole.VIEWER,
      avatar: createUserDto.avatar,
      createdAt: now,
      updatedAt: now,
    };

    this.users.push(user);
    return this.excludePassword(user);
  }

  async findAll(
    query: QueryUserDto,
  ): Promise<{ data: SafeUser[]; total: number; page: number; limit: number }> {
    let filtered = [...this.users];

    if (query.keyword) {
      const keyword = query.keyword.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(keyword) ||
          u.email.toLowerCase().includes(keyword),
      );
    }

    if (query.role) {
      filtered = filtered.filter((u) => u.role === query.role);
    }

    const total = filtered.length;
    const page = query.page || 1;
    const limit = query.limit || 10;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit).map(this.excludePassword);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return this.excludePassword(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) || null;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<SafeUser> {
    const userIndex = this.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new NotFoundException('用户不存在');
    }

    if (updateUserDto.email) {
      const existingUser = this.users.find(
        (u) => u.email === updateUserDto.email && u.id !== id,
      );
      if (existingUser) {
        throw new ConflictException('该邮箱已被使用');
      }
    }

    const user = this.users[userIndex];

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser: User = {
      ...user,
      ...updateUserDto,
      password: updateUserDto.password || user.password,
      updatedAt: new Date(),
    };

    this.users[userIndex] = updatedUser;
    return this.excludePassword(updatedUser);
  }

  async remove(id: string): Promise<void> {
    const userIndex = this.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new NotFoundException('用户不存在');
    }
    this.users.splice(userIndex, 1);
  }

  private excludePassword(user: User): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...safeUser } = user;
    return safeUser;
  }
}
