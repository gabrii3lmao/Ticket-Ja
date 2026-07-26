jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

const mockUserService = {
  create: jest.fn(),
  deleteUser: jest.fn(),
};

describe('UserController', () => {
  let controller: UserController;
  let userService: typeof mockUserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call userService.create with the DTO', async () => {
      const dto = { name: 'John', email: 'john@mail.com', password: '123456' };
      const createdUser = {
        id: 'uuid',
        name: 'John',
        email: 'john@mail.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserService.create.mockResolvedValue(createdUser);

      const result = await controller.create(dto);

      expect(userService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(createdUser);
    });
  });

  describe('delete', () => {
    it('should call userService.deleteUser with the id', async () => {
      const user = {
        id: '1',
        name: 'John',
        email: 'john@mail.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserService.deleteUser.mockResolvedValue(user);

      const result = await controller.delete('1');

      expect(userService.deleteUser).toHaveBeenCalledWith('1');
      expect(result).toEqual(user);
    });
  });
});
