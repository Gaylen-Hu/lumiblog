import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './strategies/jwt.strategy';
import { UserService } from '../user/user.service';
import { RefreshTokenService } from './refresh-token.service';
import { User as PrismaUser } from '@prisma/client';

export type SafeUser = Omit<PrismaUser, 'password'>;

export interface TokenPairResponse {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string; name: string };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<SafeUser | null> {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(`登录失败，邮箱: ${email}`);
      return null;
    }

    return this.userService.excludePassword(user);
  }

  async login(user: SafeUser): Promise<TokenPairResponse> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const expiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );

    const accessToken = this.jwtService.sign(payload, { expiresIn });
    const refreshToken = await this.refreshTokenService.createRefreshToken(
      user.id,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPairResponse> {
    if (!this.refreshTokenService.validateTokenFormat(refreshToken)) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Invalid refresh token format',
        error: 'INVALID_TOKEN',
      });
    }

    const { userId, newRefreshToken } =
      await this.refreshTokenService.validateAndConsume(refreshToken);

    // Verify user still exists
    let user: SafeUser;
    try {
      user = await this.userService.findOne(userId);
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'User no longer exists',
          error: 'INVALID_TOKEN',
        });
      }
      throw err;
    }

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const expiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );
    const accessToken = this.jwtService.sign(payload, { expiresIn });

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async logout(userId: string): Promise<void> {
    await this.refreshTokenService.revokeAllUserTokens(userId);
    this.logger.log(`User ${userId} logged out, all refresh tokens revoked`);
  }
}
