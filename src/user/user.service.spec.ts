jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from 'src/prisma.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
};

describe('UserService', () => {
  let service: UserService;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user when email is not taken', async () => {
      const dto = { name: 'John', email: 'john@mail.com', passwordHash: '123456' };
      const createdUser = { id: 'uuid', ...dto, createdAt: new Date(), updatedAt: new Date() };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(createdUser);

      const result = await service.create(dto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: dto.email } });
      expect(prisma.user.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(createdUser);
    });

    it('should throw ConflictException when email already exists', async () => {
      const dto = { name: 'John', email: 'john@mail.com', passwordHash: '123456' };
      const existingUser = { id: 'uuid', ...dto, createdAt: new Date(), updatedAt: new Date() };

      prisma.user.findUnique.mockResolvedValue(existingUser);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [
        { id: '1', name: 'John', email: 'john@mail.com', passwordHash: '123456', createdAt: new Date(), updatedAt: new Date() },
      ];

      prisma.user.findMany.mockResolvedValue(users);

      const result = await service.findAll();

      expect(prisma.user.findMany).toHaveBeenCalledWith();
      expect(result).toEqual(users);
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found', async () => {
      const user = { id: '1', name: 'John', email: 'john@mail.com', passwordHash: '123456', createdAt: new Date(), updatedAt: new Date() };

      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findByEmail('john@mail.com');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'john@mail.com' } });
      expect(result).toEqual(user);
    });

    it('should return null when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@mail.com');

      expect(result).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('should delete and return user when found', async () => {
      const user = { id: '1', name: 'John', email: 'john@mail.com', passwordHash: '123456', createdAt: new Date(), updatedAt: new Date() };

      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.delete.mockResolvedValue(user);

      const result = await service.deleteUser('1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteUser('nonexistent')).rejects.toThrow(NotFoundException);
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });
  });
});
