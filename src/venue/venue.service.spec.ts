jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { VenueService } from './venue.service';
import { PrismaService } from 'src/prisma.service';

const userId = 'user-uuid';

const mockPrisma = {
  $transaction: jest.fn(),
  venue: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  event: {
    count: jest.fn(),
  },
};

describe('VenueService', () => {
  let service: VenueService;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenueService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<VenueService>(VenueService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a venue linked to the user', async () => {
      const dto = {
        name: 'Maracanã',
        capacity: 50000,
        city: 'Rio de Janeiro',
        state: 'RJ',
      };
      const createdVenue = {
        id: 'uuid',
        organizerId: userId,
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.venue.create.mockResolvedValue(createdVenue);

      const result = await service.create(dto, userId);

      expect(prisma.venue.create).toHaveBeenCalledWith({
        data: { ...dto, organizerId: userId },
      });
      expect(result).toEqual(createdVenue);
    });
  });

  describe('findOne', () => {
    it('should return a venue when found', async () => {
      const venue = {
        id: '1',
        name: 'Maracanã',
        capacity: 50000,
        city: 'Rio de Janeiro',
        state: 'RJ',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.venue.findUnique.mockResolvedValue(venue);

      const result = await service.findOne('1');

      expect(prisma.venue.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { events: true },
      });
      expect(result).toEqual(venue);
    });

    it('should throw NotFoundException when venue not found', async () => {
      prisma.venue.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated venues', async () => {
      const venues = [
        {
          id: '1',
          name: 'Maracanã',
          capacity: 50000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prisma.$transaction.mockResolvedValue([venues, 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({
        data: venues,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });
    });

    it('should return empty array when no venues exist', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
    });

    it('should filter venues by name', async () => {
      const venues = [{ id: '1', name: 'Maracanã' }];
      prisma.$transaction.mockResolvedValue([venues, 1]);

      await service.findAll({ name: 'Mara' });

      expect(prisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'Mara', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter venues by city and state', async () => {
      const venues = [
        { id: '1', name: 'Maracanã', city: 'Rio de Janeiro', state: 'RJ' },
      ];
      prisma.$transaction.mockResolvedValue([venues, 1]);

      await service.findAll({ city: 'Rio', state: 'RJ' });

      expect(prisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: { contains: 'Rio', mode: 'insensitive' },
            state: 'RJ',
          }),
        }),
      );
    });

    it('should filter venues by capacity range', async () => {
      const venues = [{ id: '1', name: 'Maracanã', capacity: 50000 }];
      prisma.$transaction.mockResolvedValue([venues, 1]);

      await service.findAll({ minCapacity: 1000, maxCapacity: 100000 });

      expect(prisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            capacity: { gte: 1000, lte: 100000 },
          }),
        }),
      );
    });

    it('should apply sorting', async () => {
      const venues = [{ id: '1', name: 'Maracanã' }];
      prisma.$transaction.mockResolvedValue([venues, 1]);

      await service.findAll({ sortBy: 'name', sortOrder: 'asc' });

      expect(prisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        }),
      );
    });
  });

  describe('update', () => {
    it('should update and return venue when user owns it', async () => {
      const existingVenue = {
        id: '1',
        name: 'Maracanã',
        capacity: 50000,
        organizerId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updateDto = { name: 'Maracanã Reformado' };

      prisma.venue.findUnique.mockResolvedValue(existingVenue);
      prisma.venue.update.mockResolvedValue({ ...existingVenue, ...updateDto });

      const result = await service.update('1', userId, updateDto);

      expect(prisma.venue.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(prisma.venue.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto,
      });
      expect(result.name).toBe('Maracanã Reformado');
    });

    it('should throw ForbiddenException when venue not found', async () => {
      prisma.venue.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', userId, { name: 'Test' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.venue.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not the owner', async () => {
      const existingVenue = {
        id: '1',
        name: 'Maracanã',
        capacity: 50000,
        organizerId: 'other-user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.venue.findUnique.mockResolvedValue(existingVenue);

      await expect(
        service.update('1', userId, { name: 'Test' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.venue.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete and return venue when user owns it and no associated events', async () => {
      const venue = {
        id: '1',
        name: 'Maracanã',
        capacity: 50000,
        organizerId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.venue.findUnique.mockResolvedValue(venue);
      prisma.event.count.mockResolvedValue(0);
      prisma.venue.delete.mockResolvedValue(venue);

      const result = await service.delete('1', userId);

      expect(prisma.venue.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(prisma.event.count).toHaveBeenCalledWith({
        where: { venueId: '1' },
      });
      expect(prisma.venue.delete).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(venue);
    });

    it('should throw ForbiddenException when venue not found', async () => {
      prisma.venue.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent', userId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.venue.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not the owner', async () => {
      const venue = {
        id: '1',
        name: 'Maracanã',
        capacity: 50000,
        organizerId: 'other-user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.venue.findUnique.mockResolvedValue(venue);

      await expect(service.delete('1', userId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.venue.delete).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when venue has associated events', async () => {
      const venue = {
        id: '1',
        name: 'Maracanã',
        capacity: 50000,
        organizerId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.venue.findUnique.mockResolvedValue(venue);
      prisma.event.count.mockResolvedValue(3);

      await expect(service.delete('1', userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.venue.delete).not.toHaveBeenCalled();
    });
  });
});
