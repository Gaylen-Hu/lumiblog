import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRole } from './dto/create-user.dto';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('create', () => {
    it('应该成功创建用户', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const result = await service.create(createUserDto);

      expect(result.email).toBe(createUserDto.email);
      expect(result.name).toBe(createUserDto.name);
      expect(result.role).toBe(UserRole.VIEWER);
      expect(result).not.toHaveProperty('password');
      expect(result.id).toBeDefined();
    });

    it('应该使用指定的角色创建用户', async () => {
      const createUserDto = {
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
        role: UserRole.ADMIN,
      };

      const result = await service.create(createUserDto);

      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('应该在邮箱已存在时抛出 ConflictException', async () => {
      const createUserDto = {
        email: 'duplicate@example.com',
        password: 'password123',
        name: 'User 1',
      };

      await service.create(createUserDto);

      await expect(
        service.create({ ...createUserDto, name: 'User 2' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.create({
        email: 'user1@example.com',
        password: 'password123',
        name: 'User One',
        role: UserRole.ADMIN,
      });
      await service.create({
        email: 'user2@example.com',
        password: 'password123',
        name: 'User Two',
        role: UserRole.EDITOR,
      });
      await service.create({
        email: 'user3@example.com',
        password: 'password123',
        name: 'Another User',
        role: UserRole.VIEWER,
      });
    });

    it('应该返回所有用户', async () => {
      const result = await service.findAll({});

      expect(result.data.length).toBe(3);
      expect(result.total).toBe(3);
    });

    it('应该支持关键词搜索', async () => {
      const result = await service.findAll({ keyword: 'One' });

      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe('User One');
    });

    it('应该支持角色筛选', async () => {
      const result = await service.findAll({ role: UserRole.ADMIN });

      expect(result.data.length).toBe(1);
      expect(result.data[0].role).toBe(UserRole.ADMIN);
    });

    it('应该支持分页', async () => {
      const result = await service.findAll({ page: 1, limit: 2 });

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });
  });

  describe('findOne', () => {
    it('应该返回指定用户', async () => {
      const created = await service.create({
        email: 'find@example.com',
        password: 'password123',
        name: 'Find User',
      });

      const result = await service.findOne(created.id);

      expect(result.id).toBe(created.id);
      expect(result.email).toBe('find@example.com');
    });

    it('应该在用户不存在时抛出 NotFoundException', async () => {
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('应该返回包含密码的用户', async () => {
      await service.create({
        email: 'byemail@example.com',
        password: 'password123',
        name: 'Email User',
      });

      const result = await service.findByEmail('byemail@example.com');

      expect(result).toBeDefined();
      expect(result?.email).toBe('byemail@example.com');
      expect(result?.password).toBeDefined();
    });

    it('应该在用户不存在时返回 null', async () => {
      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('应该成功更新用户信息', async () => {
      const created = await service.create({
        email: 'update@example.com',
        password: 'password123',
        name: 'Original Name',
      });

      const result = await service.update(created.id, { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(result.email).toBe('update@example.com');
    });

    it('应该成功更新用户邮箱', async () => {
      const created = await service.create({
        email: 'old@example.com',
        password: 'password123',
        name: 'User',
      });

      const result = await service.update(created.id, {
        email: 'new@example.com',
      });

      expect(result.email).toBe('new@example.com');
    });

    it('应该在邮箱已被其他用户使用时抛出 ConflictException', async () => {
      await service.create({
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
      });

      const user2 = await service.create({
        email: 'user2@example.com',
        password: 'password123',
        name: 'User 2',
      });

      await expect(
        service.update(user2.id, { email: 'existing@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('应该在用户不存在时抛出 NotFoundException', async () => {
      await expect(
        service.update('nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('应该成功删除用户', async () => {
      const created = await service.create({
        email: 'delete@example.com',
        password: 'password123',
        name: 'Delete User',
      });

      await service.remove(created.id);

      await expect(service.findOne(created.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('应该在用户不存在时抛出 NotFoundException', async () => {
      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
