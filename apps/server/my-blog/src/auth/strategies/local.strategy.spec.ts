import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import { AuthService, SafeUser } from '../auth.service';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: AuthService;

  const mockAuthService = {
    validateUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('应该在验证成功时返回用户', async () => {
      const user: SafeUser = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin',
      };
      mockAuthService.validateUser.mockResolvedValue(user);

      const result = await strategy.validate('admin@example.com', 'password123');

      expect(authService.validateUser).toHaveBeenCalledWith(
        'admin@example.com',
        'password123',
      );
      expect(result).toEqual(user);
    });

    it('应该在验证失败时抛出 UnauthorizedException', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(
        strategy.validate('admin@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
