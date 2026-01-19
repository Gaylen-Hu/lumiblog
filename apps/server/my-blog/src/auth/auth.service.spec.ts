import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService, SafeUser } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('应该在凭证有效时返回用户（不含密码）', async () => {
      const result = await service.validateUser(
        'admin@example.com',
        'password123',
      );

      expect(result).toBeDefined();
      expect(result?.email).toBe('admin@example.com');
      expect(result?.name).toBe('Admin');
      expect(result).not.toHaveProperty('password');
    });

    it('应该在密码错误时返回 null', async () => {
      const result = await service.validateUser(
        'admin@example.com',
        'wrongpassword',
      );

      expect(result).toBeNull();
    });

    it('应该在用户不存在时返回 null', async () => {
      const result = await service.validateUser(
        'nonexistent@example.com',
        'password123',
      );

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('应该返回 access_token 和用户信息', async () => {
      const user: SafeUser = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin',
      };

      const result = await service.login(user);

      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        user: {
          id: '1',
          email: 'admin@example.com',
          name: 'Admin',
        },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: '1',
        email: 'admin@example.com',
      });
    });
  });
});
