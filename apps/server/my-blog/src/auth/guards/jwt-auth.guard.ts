import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiKeyService } from '../../api-key/api-key.service';

const API_KEY_PREFIX = 'sk-';

/**
 * 组合认证 Guard：支持 JWT Token 和 API Key 两种认证方式
 * - Bearer <jwt-token>: 走 JWT 验证
 * - Bearer sk-xxx: 走 API Key 验证
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private apiKeyService: ApiKeyService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('未提供认证凭据');
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');

    // API Key 以 sk- 开头，走自定义验证
    if (token.startsWith(API_KEY_PREFIX)) {
      const user = await this.apiKeyService.validateKey(token);
      if (!user) {
        throw new UnauthorizedException('无效的 API Key');
      }
      request.user = { userId: user.userId, email: user.email };
      return true;
    }

    // 否则走 Passport JWT 验证
    return super.canActivate(context) as Promise<boolean>;
  }

  handleRequest<TUser>(err: Error | null, user: TUser, info: Error | null): TUser {
    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Token expired',
        error: 'TOKEN_EXPIRED',
      });
    }

    if (err || !user) {
      throw err || new UnauthorizedException();
    }

    return user;
  }
}
