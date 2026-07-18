jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcrypt';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
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
    it('should hash password and create user without exposing passwordHash', async () => {
      const dto = { name: 'John', email: 'john@mail.com', password: '123456' };
      const hashedPassword = 'hashed-bcrypt-value';
      const createdUser = {
        id: 'uuid',
        name: 'John',
        email: 'john@mail.com',
        passwordHash: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await service.create(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: { name: 'John', email: 'john@mail.com', passwordHash: hashedPassword },
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.id).toBe('uuid');
    });

    it('should throw ConflictException when email already exists', async () => {
      const dto = { name: 'John', email: 'existing@mail.com', password: '123456' };
      const existingUser = { id: '1', name: 'Existing', email: 'existing@mail.com', passwordHash: 'hash', createdAt: new Date(), updatedAt: new Date() };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const user = { id: '1', name: 'John', email: 'john@mail.com', passwordHash: 'hash', createdAt: new Date(), updatedAt: new Date() };

      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findByEmail('john@mail.com');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'john@mail.com' } });
      expect(result).toEqual(user);
    });

    it('should return null when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@mail.com');

      expect(result).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('should delete and return user when found', async () => {
      const user = { id: '1', name: 'John', email: 'john@mail.com', passwordHash: 'hash', createdAt: new Date(), updatedAt: new Date() };

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.delete.mockResolvedValue(user);

      const result = await service.deleteUser('1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteUser('nonexistent')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });
  });
});
