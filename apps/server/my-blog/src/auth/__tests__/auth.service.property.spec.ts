// Feature: jwt-refresh-token, Property 1: Login produces a valid token pair
// **Validates: Requirements 1.1, 1.2, 1.3, 1.5, 7.2**

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as fc from 'fast-check';
import * as crypto from 'crypto';
import { AuthService, SafeUser } from '../auth.service';
import { RefreshTokenService } from '../refresh-token.service';
import { UserService } from '../../user/user.service';

const TEST_JWT_SECRET = 'test-secret-for-property-tests';

describe('Property 1: Login produces a valid token pair', () => {
  let authService: AuthService;
  let mockRefreshTokenService: { createRefreshToken: jest.Mock };

  beforeEach(async () => {
    mockRefreshTokenService = {
      createRefreshToken: jest.fn().mockImplementation(async () => {
        return crypto.randomBytes(32).toString('hex');
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: new JwtService({
            secret: TEST_JWT_SECRET,
            signOptions: { expiresIn: '15m' },
          }),
        },
        {
          provide: UserService,
          useValue: {},
        },
        {
          provide: RefreshTokenService,
          useValue: mockRefreshTokenService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: unknown) => {
              const config: Record<string, unknown> = {
                JWT_ACCESS_EXPIRES_IN: '15m',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  const safeUserArb = fc
    .record({
      id: fc.uuid(),
      email: fc.emailAddress(),
      name: fc.string({ minLength: 1 }),
    })
    .map(
      ({ id, email, name }): SafeUser => ({
        id,
        email,
        name,
        role: 'ADMIN',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

  it(
    'for any valid SafeUser, login() returns a JWT with correct sub/email, a 64-char hex refresh_token, and correct user info',
    async () => {
      await fc.assert(
        fc.asyncProperty(safeUserArb, async (user: SafeUser) => {
          // Act
          const result = await authService.login(user);

          // Assert — access_token is a valid JWT with correct sub and email
          const decoded = new JwtService({
            secret: TEST_JWT_SECRET,
          }).verify<{ sub: string; email: string; iat: number; exp: number }>(
            result.access_token,
          );
          expect(decoded.sub).toBe(user.id);
          expect(decoded.email).toBe(user.email);
          expect(typeof decoded.iat).toBe('number');
          expect(typeof decoded.exp).toBe('number');

          // exp - iat should match 15m = 900 seconds
          expect(decoded.exp - decoded.iat).toBe(900);

          // Assert — refresh_token is a 64-char hex string
          expect(result.refresh_token).toMatch(/^[0-9a-f]{64}$/);

          // Assert — user object contains correct id, email, name
          expect(result.user).toEqual({
            id: user.id,
            email: user.email,
            name: user.name,
          });

          // Assert — createRefreshToken was called with the user's id
          expect(mockRefreshTokenService.createRefreshToken).toHaveBeenCalledWith(
            user.id,
          );
        }),
        { numRuns: 100 },
      );
    },
    30_000,
  );
});
