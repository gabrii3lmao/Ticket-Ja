jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
  Role: {
    BUYER: 'BUYER',
    ORGANIZER: 'ORGANIZER',
    ADMIN: 'ADMIN',
  },
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
const orgProfileId = 'org-uuid';
const user = { id: userId, role: 'ORGANIZER' as const };
const adminUser = { id: 'admin-uuid', role: 'ADMIN' as const };
const organizerProfile = { id: orgProfileId, userId };

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
  category: {
    aggregate: jest.fn(),
  },
  orderItem: {
    aggregate: jest.fn(),
  },
  organizerProfile: {
    findUnique: jest.fn(),
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
    it('should create a venue linked to the user organizer profile', async () => {
      const dto = {
        name: 'Maracanã',
        capacity: 50000,
        city: 'Rio de Janeiro',
        state: 'RJ',
      };
      const createdVenue = {
        id: 'uuid',
        organizerProfileId: orgProfileId,
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.organizerProfile.findUnique.mockResolvedValue(organizerProfile);
      prisma.venue.create.mockResolvedValue(createdVenue);

      const result = await service.create(dto, userId);

      expect(prisma.organizerProfile.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(prisma.venue.create).toHaveBeenCalledWith({
        data: { ...dto, organizerProfileId: orgProfileId },
      });
      expect(result).toEqual(createdVenue);
    });

    it('should throw ForbiddenException when user has no organizer profile', async () => {
      const dto = {
        name: 'Maracanã',
        capacity: 50000,
        city: 'Rio de Janeiro',
        state: 'RJ',
      };

      prisma.organizerProfile.findUnique.mockResolvedValue(null);

      await expect(service.create(dto, userId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.venue.create).not.toHaveBeenCalled();
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

    it('should return totalPages 1 when page exceeds available data', async () => {
      prisma.$transaction.mockResolvedValue([[], 5]);

      const result = await service.findAll({ page: 3, limit: 10 });

      expect(result.meta).toEqual({
        total: 5,
        page: 3,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('update', () => {
    const ownedVenue = (overrides: Record<string, unknown> = {}) => ({
      id: '1',
      name: 'Maracanã',
      capacity: 50000,
      organizerProfile,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    it('should update and return venue when user owns it', async () => {
      const updateDto = { name: 'Maracanã Reformado' };

      prisma.venue.findUnique.mockResolvedValue(ownedVenue());
      prisma.venue.update.mockResolvedValue({
        ...ownedVenue(),
        ...updateDto,
      });

      const result = await service.update('1', user, updateDto);

      expect(prisma.venue.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { organizerProfile: true },
      });
      expect(prisma.venue.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto,
      });
      expect(result.name).toBe('Maracanã Reformado');
    });

    it('should throw NotFoundException when venue not found', async () => {
      prisma.venue.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', user, { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.venue.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not the owner', async () => {
      prisma.venue.findUnique.mockResolvedValue(
        ownedVenue({
          organizerProfile: { id: 'other-org', userId: 'other-user' },
        }),
      );

      await expect(service.update('1', user, { name: 'Test' })).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.venue.update).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to update a venue they do not own', async () => {
      const updateDto = { name: 'Admin Venue' };

      prisma.venue.findUnique.mockResolvedValue(
        ownedVenue({
          organizerProfile: { id: 'other-org', userId: 'other-user' },
        }),
      );
      prisma.venue.update.mockResolvedValue({
        ...ownedVenue(),
        ...updateDto,
      });

      const result = await service.update('1', adminUser, updateDto);

      expect(prisma.venue.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto,
      });
      expect(result.name).toBe('Admin Venue');
    });

    it('should throw BadRequestException when reducing capacity below allocated tickets', async () => {
      const updateDto = { capacity: 50000 };

      prisma.venue.findUnique.mockResolvedValue(ownedVenue());
      prisma.category.aggregate.mockResolvedValue({
        _sum: { quantity: 40000 },
      });
      prisma.orderItem.aggregate.mockResolvedValue({
        _sum: { quantity: 15000 },
      });

      await expect(service.update('1', user, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.venue.update).not.toHaveBeenCalled();
    });

    it('should allow increasing capacity above allocated tickets', async () => {
      const updateDto = { capacity: 100000 };

      prisma.venue.findUnique.mockResolvedValue(ownedVenue());
      prisma.category.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
      prisma.orderItem.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
      prisma.venue.update.mockResolvedValue({
        ...ownedVenue(),
        ...updateDto,
      });

      const result = await service.update('1', user, updateDto);

      expect(prisma.venue.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto,
      });
      expect(result.capacity).toBe(100000);
    });
  });

  describe('delete', () => {
    it('should delete and return venue when user owns it and no associated events', async () => {
      const venue = {
        id: '1',
        name: 'Maracanã',
        capacity: 50000,
        organizerProfile,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.venue.findUnique.mockResolvedValue(venue);
      prisma.event.count.mockResolvedValue(0);
      prisma.venue.delete.mockResolvedValue(venue);

      const result = await service.delete('1', user);

      expect(prisma.venue.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { organizerProfile: true },
      });
      expect(prisma.event.count).toHaveBeenCalledWith({
        where: { venueId: '1' },
      });
      expect(prisma.venue.delete).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(venue);
    });

    it('should throw NotFoundException when venue not found', async () => {
      prisma.venue.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent', user)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.venue.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not the owner', async () => {
      const venue = {
        id: '1',
        name: 'Maracanã',
        capacity: 50000,
        organizerProfile: { id: 'other-org', userId: 'other-user' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.venue.findUnique.mockResolvedValue(venue);

      await expect(service.delete('1', user)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.venue.delete).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to delete a venue they do not own', async () => {
      const venue = {
        id: '1',
        name: 'Maracanã',
        capacity: 50000,
        organizerProfile: { id: 'other-org', userId: 'other-user' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.venue.findUnique.mockResolvedValue(venue);
      prisma.event.count.mockResolvedValue(0);
      prisma.venue.delete.mockResolvedValue(venue);

      const result = await service.delete('1', adminUser);

      expect(prisma.venue.delete).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(venue);
    });

    it('should throw BadRequestException when venue has associated events', async () => {
      const venue = {
        id: '1',
        name: 'Maracanã',
        capacity: 50000,
        organizerProfile,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.venue.findUnique.mockResolvedValue(venue);
      prisma.event.count.mockResolvedValue(3);

      await expect(service.delete('1', user)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.venue.delete).not.toHaveBeenCalled();
    });
  });
});
