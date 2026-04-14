import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { RefreshTokenService } from './refresh-token.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let userService: { findByEmail: jest.Mock; excludePassword: jest.Mock };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  const mockRefreshTokenService = {
    createRefreshToken: jest.fn().mockResolvedValue('a'.repeat(64)),
    validateAndConsume: jest.fn(),
    revokeAllUserTokens: jest.fn().mockResolvedValue(0),
    validateTokenFormat: jest.fn().mockReturnValue(true),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: unknown) => {
      const config: Record<string, unknown> = {
        JWT_ACCESS_EXPIRES_IN: '15m',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    userService = {
      findByEmail: jest.fn(),
      excludePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: UserService, useValue: userService },
        { provide: RefreshTokenService, useValue: mockRefreshTokenService },
        { provide: ConfigService, useValue: mockConfigService },
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
      // Arrange
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: '1',
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin',
        role: 'ADMIN',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const safeUser = { id: '1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', avatar: null, createdAt: mockUser.createdAt, updatedAt: mockUser.updatedAt };
      userService.findByEmail.mockResolvedValue(mockUser);
      userService.excludePassword.mockReturnValue(safeUser);

      // Act
      const result = await service.validateUser('admin@example.com', 'password123');

      // Assert
      expect(result).toBeDefined();
      expect(result?.email).toBe('admin@example.com');
      expect(result?.name).toBe('Admin');
      expect(result).not.toHaveProperty('password');
    });

    it('应该在密码错误时返回 null', async () => {
      // Arrange
      const hashedPassword = await bcrypt.hash('password123', 10);
      userService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin',
      });

      // Act
      const result = await service.validateUser('admin@example.com', 'wrongpassword');

      // Assert
      expect(result).toBeNull();
    });

    it('应该在用户不存在时返回 null', async () => {
      // Arrange
      userService.findByEmail.mockResolvedValue(null);

      // Act
      const result = await service.validateUser('nonexistent@example.com', 'password123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('应该返回 access_token 和用户信息', async () => {
      // Arrange
      const user = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'ADMIN',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const result = await service.login(user as any);

      // Assert
      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        refresh_token: 'a'.repeat(64),
        user: {
          id: '1',
          email: 'admin@example.com',
          name: 'Admin',
        },
      });
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: '1', email: 'admin@example.com' },
      );
    });
  });
});
