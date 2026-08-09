jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcrypt';

const mockPrisma = {
  $transaction: jest.fn(),
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  event: {
    deleteMany: jest.fn(),
  },
  venue: {
    deleteMany: jest.fn(),
  },
  organizerProfile: {
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
  },
  order: {
    count: jest.fn(),
  },
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
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
        data: {
          name: 'John',
          email: 'john@mail.com',
          passwordHash: hashedPassword,
        },
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.id).toBe('uuid');
    });

    it('should throw ConflictException when email already exists', async () => {
      const dto = {
        name: 'John',
        email: 'existing@mail.com',
        password: '123456',
      };
      const existingUser = {
        id: '1',
        name: 'Existing',
        email: 'existing@mail.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const user = {
        id: '1',
        name: 'John',
        email: 'john@mail.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findByEmail('john@mail.com');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@mail.com' },
      });
      expect(result).toEqual(user);
    });

    it('should return null when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@mail.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const user = {
        id: '1',
        name: 'John',
        email: 'john@mail.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findById('1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual(user);
    });

    it('should return null when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('should delete organizer-related data and user when found', async () => {
      const user = {
        id: '1',
        name: 'John',
        email: 'john@mail.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.organizerProfile.findUnique.mockResolvedValue({
        id: 'org-1',
        userId: '1',
      });
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.event.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.venue.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.organizerProfile.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.user.delete.mockResolvedValue(user);
      mockPrisma.$transaction.mockImplementation(
        (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
      );

      const result = await service.deleteUser('1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(mockPrisma.organizerProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: '1' },
      });
      expect(mockPrisma.event.deleteMany).toHaveBeenCalledWith({
        where: { organizerProfileId: 'org-1' },
      });
      expect(mockPrisma.venue.deleteMany).toHaveBeenCalledWith({
        where: { organizerProfileId: 'org-1' },
      });
      expect(mockPrisma.organizerProfile.deleteMany).toHaveBeenCalledWith({
        where: { userId: '1' },
      });
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual(user);
    });

    it('should only delete the user when there is no organizer profile', async () => {
      const user = {
        id: '2',
        name: 'Jane',
        email: 'jane@mail.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.organizerProfile.findUnique.mockResolvedValue(null);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.user.delete.mockResolvedValue(user);
      mockPrisma.$transaction.mockImplementation(
        (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
      );

      const result = await service.deleteUser('2');

      expect(mockPrisma.event.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.venue.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.organizerProfile.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: '2' },
      });
      expect(result).toEqual(user);
    });

    it('should throw BadRequestException when user has associated orders', async () => {
      const user = {
        id: '1',
        name: 'John',
        email: 'john@mail.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.organizerProfile.findUnique.mockResolvedValue(null);
      mockPrisma.order.count.mockResolvedValue(3);

      await expect(service.deleteUser('1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteUser('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });
  });
});
