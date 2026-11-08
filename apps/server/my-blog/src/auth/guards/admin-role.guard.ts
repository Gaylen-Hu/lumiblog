import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private readonly db: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const id = context.switchToHttp().getRequest().user?.userId;
    if (!id) return false;
    const user = await this.db.user.findUnique({
      where: { id },
      select: { role: true },
    });
    return user?.role === 'ADMIN';
  }
}

@Injectable()
export class AdminOrOwnProfileGuard extends AdminRoleGuard {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    if (req.params.id === req.user?.userId && req.body?.role === undefined)
      return Promise.resolve(true);
    return super.canActivate(context);
  }
}
