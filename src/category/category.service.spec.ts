jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CategoryService } from './category.service';
import { PrismaService } from 'src/prisma.service';

const mockPrisma = {
  $transaction: jest.fn(),
  category: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  event: {
    findUnique: jest.fn(),
  },
  orderItem: {
    count: jest.fn(),
  },
};

const eventId = 'event-uuid';
const userId = 'user-uuid';

describe('CategoryService', () => {
  let service: CategoryService;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a category when user owns the event', async () => {
      const dto = {
        name: 'Pista Premium',
        price: 250,
        quantity: 1000,
      };
      const createdCategory = { id: 'uuid', ...dto, eventId, createdAt: new Date() };

      prisma.event.findUnique.mockResolvedValue({
        id: eventId,
        organizerId: userId,
      });
      prisma.category.create.mockResolvedValue(createdCategory);

      const result = await service.create(dto, eventId, userId);

      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: eventId },
      });
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: { ...dto, eventId },
      });
      expect(result).toEqual(createdCategory);
    });

    it('should throw ForbiddenException when user does not own the event', async () => {
      const dto = {
        name: 'Pista Premium',
        price: 250,
        quantity: 1000,
      };

      prisma.event.findUnique.mockResolvedValue({
        id: eventId,
        organizerId: 'other-user',
      });

      await expect(
        service.create(dto, eventId, userId),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.category.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a category when found', async () => {
      const category = {
        id: '1',
        name: 'Pista Premium',
        price: 250,
        quantity: 1000,
        eventId,
        event: { id: eventId, name: 'Rock in Rio' },
        createdAt: new Date(),
      };

      prisma.category.findUnique.mockResolvedValue(category);

      const result = await service.findOne('1');

      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { event: true },
      });
      expect(result).toEqual(category);
    });

    it('should throw NotFoundException when category not found', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated categories', async () => {
      const categories = [
        {
          id: '1',
          name: 'Pista Premium',
          price: 250,
          quantity: 1000,
          eventId,
          createdAt: new Date(),
        },
      ];

      prisma.$transaction.mockResolvedValue([categories, 1]);

      const result = await service.findAll({ page: 1, limit: 10 }, eventId);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({
        data: categories,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });
    });

    it('should return empty array when no categories exist', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.findAll({ page: 1, limit: 10 }, eventId);

      expect(result).toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
    });

    it('should filter categories by name', async () => {
      const categories = [{ id: '1', name: 'Pista Premium' }];
      prisma.$transaction.mockResolvedValue([categories, 1]);

      await service.findAll({ name: 'Pista' }, eventId);

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'Pista', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter categories by price range', async () => {
      const categories = [{ id: '1', name: 'Pista Premium', price: 250 }];
      prisma.$transaction.mockResolvedValue([categories, 1]);

      await service.findAll({ minPrice: 100, maxPrice: 500 }, eventId);

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: { gte: 100, lte: 500 },
          }),
        }),
      );
    });

    it('should apply sorting', async () => {
      const categories = [{ id: '1', name: 'Pista Premium' }];
      prisma.$transaction.mockResolvedValue([categories, 1]);

      await service.findAll({ sortBy: 'price', sortOrder: 'asc' }, eventId);

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: 'asc' },
        }),
      );
    });
  });

  describe('update', () => {
    it('should update and return category when user owns the event', async () => {
      const existingCategory = {
        id: '1',
        name: 'Pista Premium',
        price: 250,
        quantity: 1000,
        eventId,
        createdAt: new Date(),
      };
      const updateDto = { name: 'Pista VIP' };

      prisma.category.findUnique.mockResolvedValue(existingCategory);
      prisma.event.findUnique.mockResolvedValue({
        id: eventId,
        organizerId: userId,
      });
      prisma.category.update.mockResolvedValue({ ...existingCategory, ...updateDto });

      const result = await service.update('1', userId, updateDto);

      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: eventId },
      });
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto,
      });
      expect(result.name).toBe('Pista VIP');
    });

    it('should throw NotFoundException when category not found', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', userId, { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user does not own the event', async () => {
      const existingCategory = {
        id: '1',
        name: 'Pista Premium',
        price: 250,
        quantity: 1000,
        eventId,
        createdAt: new Date(),
      };

      prisma.category.findUnique.mockResolvedValue(existingCategory);
      prisma.event.findUnique.mockResolvedValue({
        id: eventId,
        organizerId: 'other-user',
      });

      await expect(
        service.update('1', userId, { name: 'Test' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete and return category when user owns the event and no associated orders', async () => {
      const category = {
        id: '1',
        name: 'Pista Premium',
        price: 250,
        quantity: 1000,
        eventId,
        createdAt: new Date(),
      };

      prisma.category.findUnique.mockResolvedValue(category);
      prisma.event.findUnique.mockResolvedValue({
        id: eventId,
        organizerId: userId,
      });
      prisma.orderItem.count.mockResolvedValue(0);
      prisma.category.delete.mockResolvedValue(category);

      const result = await service.remove('1', userId);

      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: eventId },
      });
      expect(prisma.orderItem.count).toHaveBeenCalledWith({
        where: { categoryId: '1' },
      });
      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual(category);
    });

    it('should throw NotFoundException when category not found', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent', userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user does not own the event', async () => {
      const category = {
        id: '1',
        name: 'Pista Premium',
        price: 250,
        quantity: 1000,
        eventId,
        createdAt: new Date(),
      };

      prisma.category.findUnique.mockResolvedValue(category);
      prisma.event.findUnique.mockResolvedValue({
        id: eventId,
        organizerId: 'other-user',
      });

      await expect(service.remove('1', userId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when category has associated order items', async () => {
      const category = {
        id: '1',
        name: 'Pista Premium',
        price: 250,
        quantity: 1000,
        eventId,
        createdAt: new Date(),
      };

      prisma.category.findUnique.mockResolvedValue(category);
      prisma.event.findUnique.mockResolvedValue({
        id: eventId,
        organizerId: userId,
      });
      prisma.orderItem.count.mockResolvedValue(5);

      await expect(service.remove('1', userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });
  });
});
