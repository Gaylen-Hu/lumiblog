import { ForbiddenException } from '@nestjs/common';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_ENVIRONMENT, EnvironmentConfigDto, EnvironmentConfigService } from './environment-config';

describe('environment administrator configuration', () => {
  it('does not let an earlier database read overwrite a completed save', async () => {
    let complete!: (value: unknown) => void;
    const next = { ...DEFAULT_ENVIRONMENT, city: '上海', revision: 1 };
    const prisma = { environmentConfig: { findUnique: jest.fn(() => new Promise(resolve => { complete=resolve; })), upsert: jest.fn().mockResolvedValue(next) } } as unknown as PrismaService;
    const service = new EnvironmentConfigService(prisma);
    const reading=service.read();
    expect(await service.save(next,'admin')).toMatchObject({city:'上海',revision:1});
    complete(DEFAULT_ENVIRONMENT);
    expect(await reading).toMatchObject({city:'上海',revision:1});
    expect(await service.read()).toMatchObject({city:'上海',revision:1});
  });
  it('does not equate a logged-in editor with an administrator', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ role: 'EDITOR' }) } } as unknown as PrismaService;
    await expect(new EnvironmentConfigService(prisma).authorize('editor')).rejects.toThrow(ForbiddenException);
  });
  it('validates coordinates and does not allow arbitrary preset names', async () => {
    const dto = Object.assign(new EnvironmentConfigDto(), { city: '杭州', timezone: 'Asia/Shanghai', latitude: 91, longitude: 200, preset: 'invalid' });
    expect((await validate(dto)).map(error => error.property)).toEqual(expect.arrayContaining(['latitude','longitude','preset']));
  });
  it('rejects invalid IANA timezones before database writes', async () => {
    const prisma = { environmentConfig: { upsert: jest.fn() } } as unknown as PrismaService;
    await expect(new EnvironmentConfigService(prisma).save({ city: '杭州', timezone: 'invalid-timezone', latitude: 30, longitude: 120, preset: 'auto' }, 'admin')).rejects.toThrow();
    expect(prisma.environmentConfig.upsert).not.toHaveBeenCalled();
  });
});
