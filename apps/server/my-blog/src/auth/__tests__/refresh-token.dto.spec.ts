// Unit tests for RefreshTokenDto validation
// Requirements: 7.1, 7.4

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

describe('RefreshTokenDto', () => {
  it('should reject empty refresh_token', async () => {
    const dto = plainToInstance(RefreshTokenDto, { refresh_token: '' });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const tokenError = errors.find((e) => e.property === 'refresh_token');
    expect(tokenError).toBeDefined();
    expect(tokenError!.constraints).toHaveProperty('isNotEmpty');
  });

  it('should reject non-string refresh_token', async () => {
    const dto = plainToInstance(RefreshTokenDto, { refresh_token: 12345 });
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const tokenError = errors.find((e) => e.property === 'refresh_token');
    expect(tokenError).toBeDefined();
    expect(tokenError!.constraints).toHaveProperty('isString');
  });

  it('should pass validation with a valid string', async () => {
    const dto = plainToInstance(RefreshTokenDto, {
      refresh_token: 'a'.repeat(64),
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
