import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy, JwtPayload } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-jwt-secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate', () => {
    it('应该在 payload 有效时返回用户信息', () => {
      const payload: JwtPayload = {
        sub: '1',
        email: 'admin@example.com',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        userId: '1',
        email: 'admin@example.com',
      });
    });

    it('应该在 payload.sub 为空时抛出 UnauthorizedException', () => {
      const payload = {
        sub: '',
        email: 'admin@example.com',
      } as JwtPayload;

      expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
    });
  });
});
