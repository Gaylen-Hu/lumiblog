import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService, SafeUser } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
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
