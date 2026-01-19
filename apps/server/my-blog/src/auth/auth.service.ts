import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './strategies/jwt.strategy';

// TODO: 替换为真实的 User 类型（来自 Prisma）
interface User {
  id: string;
  email: string;
  password: string;
  name: string;
}

export type SafeUser = Omit<User, 'password'>;

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  // TODO: 集成 Prisma 后替换为真实数据库查询
  private async findUserByEmail(email: string): Promise<User | null> {
    // 模拟用户数据，实际应从数据库查询
    const mockUsers: User[] = [
      {
        id: '1',
        email: 'admin@example.com',
        // 密码: password123
        password: await bcrypt.hash('password123', 10),
        name: 'Admin',
      },
    ];
    return mockUsers.find((u) => u.email === email) || null;
  }

  async validateUser(email: string, password: string): Promise<SafeUser | null> {
    const user = await this.findUserByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: SafeUser) {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}
