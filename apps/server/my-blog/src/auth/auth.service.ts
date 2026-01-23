import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './strategies/jwt.strategy';
import { UserService } from '../user/user.service';
import { User as PrismaUser } from '@prisma/client';

export type SafeUser = Omit<PrismaUser, 'password'>;

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  async validateUser(email: string, password: string): Promise<SafeUser | null> {
    console.log('validateUser called with email:', email);
    const user = await this.userService.findByEmail(email);
    console.log('User found:', user ? 'yes' : 'no');

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      return null;
    }

    return this.userService.excludePassword(user);
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
