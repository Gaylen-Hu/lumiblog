import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService, SafeUser } from './user.service';
import { UserRole } from './dto/create-user.dto';

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;

  const mockUser: SafeUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.VIEWER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该调用 userService.create 并返回结果', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      mockUserService.create.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto);

      expect(userService.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    it('应该调用 userService.findAll 并返回分页结果', async () => {
      const query = { page: 1, limit: 10 };
      const paginatedResult = {
        data: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockUserService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(query);

      expect(userService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(paginatedResult);
    });

    it('应该支持关键词和角色筛选', async () => {
      const query = { keyword: 'test', role: UserRole.ADMIN };

      mockUserService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      await controller.findAll(query);

      expect(userService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('应该调用 userService.findOne 并返回用户', async () => {
      mockUserService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne('1');

      expect(userService.findOne).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('应该调用 userService.update 并返回更新后的用户', async () => {
      const updateUserDto = { name: 'Updated Name' };
      const updatedUser = { ...mockUser, name: 'Updated Name' };

      mockUserService.update.mockResolvedValue(updatedUser);

      const result = await controller.update('1', updateUserDto);

      expect(userService.update).toHaveBeenCalledWith('1', updateUserDto);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('remove', () => {
    it('应该调用 userService.remove', async () => {
      mockUserService.remove.mockResolvedValue(undefined);

      await controller.remove('1');

      expect(userService.remove).toHaveBeenCalledWith('1');
    });
  });
});
