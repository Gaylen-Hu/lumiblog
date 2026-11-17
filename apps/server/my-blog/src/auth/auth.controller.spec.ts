import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, type INestApplication } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService, SafeUser } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let app: INestApplication;
  const rejectLogin = jest.fn(() => { throw new UnauthorizedException(); });

  const mockAuthService = {
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ name: 'short', ttl: 60000, limit: 50 }])],
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(LocalAuthGuard).useValue({ canActivate: rejectLogin })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    await app.init();
    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('limits attempted passwords before the authentication strategy runs', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer()).post('/auth/login').send({}).expect(401);
      }
      await request(app.getHttpServer()).post('/auth/login').send({}).expect(429);
      expect(rejectLogin).toHaveBeenCalledTimes(5);
    });

    it('应该调用 authService.login 并返回结果', async () => {
      const user: SafeUser = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'ADMIN',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const loginResult = {
        access_token: 'mock-token',
        user: { id: '1', email: 'admin@example.com', name: 'Admin' },
      };

      mockAuthService.login.mockResolvedValue(loginResult);

      const req = { user };
      const result = await controller.login(req, {
        email: 'admin@example.com',
        password: 'password123',
      });

      expect(authService.login).toHaveBeenCalledWith(user);
      expect(result).toEqual(loginResult);
    });
  });

  describe('getProfile', () => {
    it('应该返回请求中的用户信息', () => {
      const req = {
        user: { userId: '1', email: 'admin@example.com' },
      };

      const result = controller.getProfile(req);

      expect(result).toEqual({ userId: '1', email: 'admin@example.com' });
    });
  });
});
