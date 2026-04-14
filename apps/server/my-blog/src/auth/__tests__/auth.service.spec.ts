// Unit tests for AuthService: login token pair, refreshTokens, logout
// Requirements: 1.1, 2.2, 2.6, 3.2, 3.4

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthService, SafeUser } from '../auth.service';
import { RefreshTokenService } from '../refresh-token.service';
import { UserService } from '../../user/user.service';

describe('AuthService (refresh/logout)', () => {
  let authService: AuthService;

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-access-token'),
  };

  const mockRefreshTokenService = {
    createRefreshToken: jest.fn().mockResolvedValue('a'.repeat(64)),
    validateAndConsume: jest.fn(),
    revokeAllUserTokens: jest.fn().mockResolvedValue(2),
    validateTokenFormat: jest.fn(),
  };

  const mockUserService = {
    findOne: jest.fn(),
    findByEmail: jest.fn(),
    excludePassword: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: unknown) => {
      const config: Record<string, unknown> = {
        JWT_ACCESS_EXPIRES_IN: '15m',
      };
      return config[key] ?? defaultValue;
    }),
  };

  // Spy on Logger.prototype.log to verify logout logging
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: UserService, useValue: mockUserService },
        { provide: RefreshTokenService, useValue: mockRefreshTokenService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);

    // Spy on the internal logger
    loggerLogSpy = jest.spyOn((authService as any).logger, 'log');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── Requirement 1.1: login() returns token pair ───────────────────

  describe('login()', () => {
    it('should return a token pair with access_token, refresh_token, and user info', async () => {
      // Arrange
      const user: SafeUser = {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'ADMIN',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const result = await authService.login(user);

      // Assert
      expect(result).toEqual({
        access_token: 'mock-access-token',
        refresh_token: 'a'.repeat(64),
        user: {
          id: 'user-1',
          email: 'admin@example.com',
          name: 'Admin',
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-1', email: 'admin@example.com' },
      );
      expect(mockRefreshTokenService.createRefreshToken).toHaveBeenCalledWith(
        'user-1',
      );
    });
  });

  // ─── Requirement 2.2, 2.6: refreshTokens() ────────────────────────

  describe('refreshTokens()', () => {
    it('should reject with 401 when token format is invalid', async () => {
      // Arrange
      mockRefreshTokenService.validateTokenFormat.mockReturnValue(false);

      // Act & Assert
      await expect(
        authService.refreshTokens('not-a-valid-token'),
      ).rejects.toThrow(UnauthorizedException);

      // validateAndConsume should NOT be called for invalid format
      expect(
        mockRefreshTokenService.validateAndConsume,
      ).not.toHaveBeenCalled();
    });

    it('should reject with 401 when user no longer exists', async () => {
      // Arrange
      const validToken = 'b'.repeat(64);
      mockRefreshTokenService.validateTokenFormat.mockReturnValue(true);
      mockRefreshTokenService.validateAndConsume.mockResolvedValue({
        userId: 'deleted-user',
        newRefreshToken: 'c'.repeat(64),
      });
      mockUserService.findOne.mockRejectedValue(
        new NotFoundException('用户不存在'),
      );

      // Act & Assert
      await expect(
        authService.refreshTokens(validToken),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockUserService.findOne).toHaveBeenCalledWith('deleted-user');
    });

    it('should return a new token pair when refresh token is valid and user exists', async () => {
      // Arrange
      const validToken = 'b'.repeat(64);
      const existingUser: SafeUser = {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'ADMIN',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRefreshTokenService.validateTokenFormat.mockReturnValue(true);
      mockRefreshTokenService.validateAndConsume.mockResolvedValue({
        userId: 'user-1',
        newRefreshToken: 'c'.repeat(64),
      });
      mockUserService.findOne.mockResolvedValue(existingUser);

      // Act
      const result = await authService.refreshTokens(validToken);

      // Assert
      expect(result).toEqual({
        access_token: 'mock-access-token',
        refresh_token: 'c'.repeat(64),
        user: {
          id: 'user-1',
          email: 'admin@example.com',
          name: 'Admin',
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-1', email: 'admin@example.com' },
      );
    });

    it('should re-throw non-NotFoundException errors from userService.findOne', async () => {
      // Arrange
      const validToken = 'b'.repeat(64);
      mockRefreshTokenService.validateTokenFormat.mockReturnValue(true);
      mockRefreshTokenService.validateAndConsume.mockResolvedValue({
        userId: 'user-1',
        newRefreshToken: 'c'.repeat(64),
      });
      mockUserService.findOne.mockRejectedValue(new Error('DB connection lost'));

      // Act & Assert
      await expect(
        authService.refreshTokens(validToken),
      ).rejects.toThrow('DB connection lost');
    });
  });

  // ─── Requirement 3.2, 3.4: logout() ───────────────────────────────

  describe('logout()', () => {
    it('should call revokeAllUserTokens and log the event', async () => {
      // Arrange
      mockRefreshTokenService.revokeAllUserTokens.mockResolvedValue(3);

      // Act
      await authService.logout('user-1');

      // Assert
      expect(
        mockRefreshTokenService.revokeAllUserTokens,
      ).toHaveBeenCalledWith('user-1');
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('user-1'),
      );
    });

    it('should succeed even when user has no active tokens', async () => {
      // Arrange
      mockRefreshTokenService.revokeAllUserTokens.mockResolvedValue(0);

      // Act & Assert — should not throw
      await expect(authService.logout('user-no-tokens')).resolves.toBeUndefined();
      expect(
        mockRefreshTokenService.revokeAllUserTokens,
      ).toHaveBeenCalledWith('user-no-tokens');
    });
  });
});
