jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
  Role: {
    BUYER: 'BUYER',
    ORGANIZER: 'ORGANIZER',
    ADMIN: 'ADMIN',
  },
  EventStatus: {
    DRAFT: 'DRAFT',
    PUBLISHED: 'PUBLISHED',
    FINISHED: 'FINISHED',
    CANCELED: 'CANCELED',
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventService } from './event.service';
import { PrismaService } from 'src/prisma.service';

const mockPrisma = {
  $transaction: jest.fn(),
  event: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  venue: {
    findUnique: jest.fn(),
  },
  category: {
    count: jest.fn(),
  },
  organizerProfile: {
    findUnique: jest.fn(),
  },
};

const userId = 'user-uuid';
const orgProfileId = 'org-uuid';
const user = { id: userId, role: 'ORGANIZER' as const };
const adminUser = { id: 'admin-uuid', role: 'ADMIN' as const };
const organizerProfile = { id: orgProfileId, userId };

describe('EventService', () => {
  let service: EventService;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an event linked to the organizer profile when the venue belongs to them', async () => {
      const dto = {
        name: 'Rock in Rio',
        artists: ['Artista'],
        startDate: new Date('2026-12-01'),
        venueId: 'venue-uuid',
      };
      const createdEvent = {
        id: 'uuid',
        ...dto,
        organizerProfileId: orgProfileId,
      };

      prisma.organizerProfile.findUnique.mockResolvedValue(organizerProfile);
      prisma.venue.findUnique.mockResolvedValue({
        id: 'venue-uuid',
        organizerProfile,
      });
      prisma.event.create.mockResolvedValue(createdEvent);

      const result = await service.create(dto, user);

      expect(prisma.organizerProfile.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(prisma.venue.findUnique).toHaveBeenCalledWith({
        where: { id: 'venue-uuid' },
        include: { organizerProfile: true },
      });
      expect(prisma.event.create).toHaveBeenCalledWith({
        data: { ...dto, organizerProfileId: orgProfileId },
      });
      expect(result).toEqual(createdEvent);
    });

    it('should throw BadRequestException when endDate is before startDate', async () => {
      const dto = {
        name: 'Rock in Rio',
        artists: ['Artista'],
        startDate: new Date('2026-12-01'),
        endDate: new Date('2026-11-01'),
        venueId: 'venue-uuid',
      };

      await expect(service.create(dto, user)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.event.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user has no organizer profile', async () => {
      const dto = {
        name: 'Rock in Rio',
        artists: ['Artista'],
        startDate: new Date('2026-12-01'),
        venueId: 'venue-uuid',
      };

      prisma.organizerProfile.findUnique.mockResolvedValue(null);

      await expect(service.create(dto, user)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.event.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when venue does not exist', async () => {
      const dto = {
        name: 'Rock in Rio',
        artists: ['Artista'],
        startDate: new Date('2026-12-01'),
        venueId: 'nonexistent',
      };

      prisma.organizerProfile.findUnique.mockResolvedValue(organizerProfile);
      prisma.venue.findUnique.mockResolvedValue(null);

      await expect(service.create(dto, user)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.event.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when venue belongs to another user', async () => {
      const dto = {
        name: 'Rock in Rio',
        artists: ['Artista'],
        startDate: new Date('2026-12-01'),
        venueId: 'venue-uuid',
      };

      prisma.organizerProfile.findUnique.mockResolvedValue(organizerProfile);
      prisma.venue.findUnique.mockResolvedValue({
        id: 'venue-uuid',
        organizerProfile: { id: 'other-org', userId: 'other-user' },
      });

      await expect(service.create(dto, user)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.event.create).not.toHaveBeenCalled();
    });

    it('should create an event when endDate equals startDate', async () => {
      const dto = {
        name: 'Rock in Rio',
        artists: ['Artista'],
        startDate: new Date('2026-12-01'),
        endDate: new Date('2026-12-01'),
        venueId: 'venue-uuid',
      };
      const createdEvent = {
        id: 'uuid',
        ...dto,
        organizerProfileId: orgProfileId,
      };

      prisma.organizerProfile.findUnique.mockResolvedValue(organizerProfile);
      prisma.venue.findUnique.mockResolvedValue({
        id: 'venue-uuid',
        organizerProfile,
      });
      prisma.event.create.mockResolvedValue(createdEvent);

      const result = await service.create(dto, user);

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: { ...dto, organizerProfileId: orgProfileId },
      });
      expect(result).toEqual(createdEvent);
    });
  });

  describe('findOne', () => {
    it('should return an event with venue and categories when found', async () => {
      const event = {
        id: '1',
        name: 'Rock in Rio',
        venue: { id: 'venue-uuid', name: 'Maracanã' },
        categories: [{ id: 'cat-uuid', name: 'Pista', price: 250 }],
      };

      prisma.event.findUnique.mockResolvedValue(event);

      const result = await service.findOne('1');

      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { venue: true, categories: true },
      });
      expect(result).toEqual(event);
    });

    it('should throw NotFoundException when event not found', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated events', async () => {
      const events = [
        {
          id: '1',
          name: 'Rock in Rio',
          venue: { id: 'venue-uuid', name: 'Maracanã' },
          categories: [],
        },
      ];

      prisma.$transaction.mockResolvedValue([events, 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({
        data: events,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });
    });

    it('should return empty array when no events exist', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
    });

    it('should filter events by name', async () => {
      const events = [{ id: '1', name: 'Rock in Rio' }];
      prisma.$transaction.mockResolvedValue([events, 1]);

      await service.findAll({ name: 'Rock' });

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'Rock', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter events by city and state', async () => {
      const events = [{ id: '1', name: 'Rock in Rio' }];
      prisma.$transaction.mockResolvedValue([events, 1]);

      await service.findAll({ city: 'São Paulo', state: 'SP' });

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            venue: {
              city: { contains: 'São Paulo', mode: 'insensitive' },
              state: 'SP',
            },
          }),
        }),
      );
    });

    it('should apply sorting', async () => {
      const events = [{ id: '1', name: 'Rock in Rio' }];
      prisma.$transaction.mockResolvedValue([events, 1]);

      await service.findAll({ sortBy: 'name', sortOrder: 'asc' });

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        }),
      );
    });

    it('should filter events by startDate', async () => {
      const events = [{ id: '1', name: 'Rock in Rio' }];
      prisma.$transaction.mockResolvedValue([events, 1]);

      await service.findAll({ startDate: new Date('2026-09-15') });

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'PUBLISHED',
            startDate: { gte: new Date('2026-09-15') },
          },
        }),
      );
    });

    it('should filter events by endDate', async () => {
      const events = [{ id: '1', name: 'Rock in Rio' }];
      prisma.$transaction.mockResolvedValue([events, 1]);

      await service.findAll({ endDate: new Date('2026-09-16') });

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'PUBLISHED',
            endDate: { lte: new Date('2026-09-16') },
          },
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
    const ownedEvent = (overrides: Record<string, unknown> = {}) => ({
      id: '1',
      name: 'Rock in Rio',
      startDate: new Date('2026-12-01'),
      organizerProfile,
      ...overrides,
    });

    it('should update and return event when user is the organizer', async () => {
      const updateDto = { name: 'Updated Show' };

      prisma.event.findUnique.mockResolvedValue(ownedEvent());
      prisma.event.update.mockResolvedValue({
        ...ownedEvent(),
        ...updateDto,
      });

      const result = await service.update('1', user, updateDto);

      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { organizerProfile: true },
      });
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto,
      });
      expect(result.name).toBe('Updated Show');
    });

    it('should throw NotFoundException when event not found', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', user, { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not the organizer', async () => {
      prisma.event.findUnique.mockResolvedValue(
        ownedEvent({
          organizerProfile: { id: 'other-org', userId: 'other-user' },
        }),
      );

      await expect(service.update('1', user, { name: 'Test' })).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to update an event they do not own', async () => {
      const updateDto = { name: 'Admin Update' };

      prisma.event.findUnique.mockResolvedValue(
        ownedEvent({
          organizerProfile: { id: 'other-org', userId: 'other-user' },
        }),
      );
      prisma.event.update.mockResolvedValue({
        ...ownedEvent(),
        ...updateDto,
      });

      const result = await service.update('1', adminUser, updateDto);

      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto,
      });
      expect(result.name).toBe('Admin Update');
    });

    it('should throw BadRequestException when endDate is before the existing startDate', async () => {
      prisma.event.findUnique.mockResolvedValue(ownedEvent());

      await expect(
        service.update('1', user, { endDate: new Date('2026-11-01') }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when changing to a nonexistent venue', async () => {
      prisma.event.findUnique.mockResolvedValue(ownedEvent());
      prisma.venue.findUnique.mockResolvedValue(null);

      await expect(
        service.update('1', user, { venueId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when changing to a venue of another user', async () => {
      prisma.event.findUnique.mockResolvedValue(ownedEvent());
      prisma.venue.findUnique.mockResolvedValue({
        id: 'venue-uuid',
        organizerProfile: { id: 'other-org', userId: 'other-user' },
      });

      await expect(
        service.update('1', user, { venueId: 'venue-uuid' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('should allow changing venueId when the venue belongs to the user', async () => {
      const updateDto = { venueId: 'new-venue' };

      prisma.event.findUnique.mockResolvedValue(ownedEvent());
      prisma.venue.findUnique.mockResolvedValue({
        id: 'new-venue',
        organizerProfile,
      });
      prisma.event.update.mockResolvedValue({
        ...ownedEvent(),
        ...updateDto,
      });

      const result = await service.update('1', user, updateDto);

      expect(prisma.venue.findUnique).toHaveBeenCalledWith({
        where: { id: 'new-venue' },
        include: { organizerProfile: true },
      });
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto,
      });
      expect(result.venueId).toBe('new-venue');
    });

    it('should allow endDate equal to the existing startDate', async () => {
      const updateDto = { endDate: new Date('2026-12-01') };

      prisma.event.findUnique.mockResolvedValue(ownedEvent());
      prisma.event.update.mockResolvedValue({
        ...ownedEvent(),
        ...updateDto,
      });

      const result = await service.update('1', user, updateDto);

      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto,
      });
      expect(result.endDate).toEqual(updateDto.endDate);
    });
  });

  describe('updateStatus', () => {
    const statusEvent = (status: string) => ({
      id: '1',
      status,
      organizerProfile,
    });

    it('should publish an event that has categories', async () => {
      prisma.event.findUnique.mockResolvedValue(statusEvent('DRAFT'));
      prisma.category.count.mockResolvedValue(2);
      prisma.event.update.mockResolvedValue({
        ...statusEvent('DRAFT'),
        status: 'PUBLISHED',
      });

      const result = await service.updateStatus('1', user, 'PUBLISHED');

      expect(prisma.category.count).toHaveBeenCalledWith({
        where: { eventId: '1' },
      });
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'PUBLISHED' },
      });
      expect(result.status).toBe('PUBLISHED');
    });

    it('should throw BadRequestException when publishing without categories', async () => {
      prisma.event.findUnique.mockResolvedValue(statusEvent('DRAFT'));
      prisma.category.count.mockResolvedValue(0);

      await expect(
        service.updateStatus('1', user, 'PUBLISHED'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException on an invalid transition', async () => {
      prisma.event.findUnique.mockResolvedValue(statusEvent('DRAFT'));

      await expect(service.updateStatus('1', user, 'FINISHED')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when transitioning out of CANCELED', async () => {
      prisma.event.findUnique.mockResolvedValue(statusEvent('CANCELED'));

      await expect(
        service.updateStatus('1', user, 'PUBLISHED'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when event not found', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('1', user, 'PUBLISHED'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not the organizer', async () => {
      prisma.event.findUnique.mockResolvedValue(statusEvent('DRAFT'));
      prisma.event.findUnique.mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        organizerProfile: { id: 'other-org', userId: 'other-user' },
      });

      await expect(
        service.updateStatus('1', user, 'PUBLISHED'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to update the status of an event they do not own', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        organizerProfile: { id: 'other-org', userId: 'other-user' },
      });
      prisma.category.count.mockResolvedValue(1);
      prisma.event.update.mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
      });

      const result = await service.updateStatus('1', adminUser, 'PUBLISHED');

      expect(result.status).toBe('PUBLISHED');
    });

    it('should transition PUBLISHED to FINISHED', async () => {
      prisma.event.findUnique.mockResolvedValue(statusEvent('PUBLISHED'));
      prisma.event.update.mockResolvedValue({
        ...statusEvent('PUBLISHED'),
        status: 'FINISHED',
      });

      const result = await service.updateStatus('1', user, 'FINISHED');

      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'FINISHED' },
      });
      expect(result.status).toBe('FINISHED');
    });

    it('should transition PUBLISHED to CANCELED', async () => {
      prisma.event.findUnique.mockResolvedValue(statusEvent('PUBLISHED'));
      prisma.event.update.mockResolvedValue({
        ...statusEvent('PUBLISHED'),
        status: 'CANCELED',
      });

      const result = await service.updateStatus('1', user, 'CANCELED');

      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'CANCELED' },
      });
      expect(result.status).toBe('CANCELED');
    });

    it('should transition DRAFT to CANCELED', async () => {
      prisma.event.findUnique.mockResolvedValue(statusEvent('DRAFT'));
      prisma.event.update.mockResolvedValue({
        ...statusEvent('DRAFT'),
        status: 'CANCELED',
      });

      const result = await service.updateStatus('1', user, 'CANCELED');

      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'CANCELED' },
      });
      expect(result.status).toBe('CANCELED');
    });

    it('should transition FINISHED to CANCELED', async () => {
      prisma.event.findUnique.mockResolvedValue(statusEvent('FINISHED'));
      prisma.event.update.mockResolvedValue({
        ...statusEvent('FINISHED'),
        status: 'CANCELED',
      });

      const result = await service.updateStatus('1', user, 'CANCELED');

      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'CANCELED' },
      });
      expect(result.status).toBe('CANCELED');
    });
  });

  describe('delete', () => {
    it('should delete and return event when user is the organizer', async () => {
      const event = { id: '1', name: 'Rock in Rio', organizerProfile };

      prisma.event.findUnique.mockResolvedValue(event);
      prisma.category.count.mockResolvedValue(0);
      prisma.event.delete.mockResolvedValue(event);

      const result = await service.delete('1', user);

      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { organizerProfile: true },
      });
      expect(prisma.category.count).toHaveBeenCalledWith({
        where: { eventId: '1' },
      });
      expect(prisma.event.delete).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(event);
    });

    it('should throw NotFoundException when event not found', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent', user)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.event.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not the organizer', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: '1',
        organizerProfile: { id: 'other-org', userId: 'other-user' },
      });

      await expect(service.delete('1', user)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.event.delete).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to delete an event they do not own', async () => {
      const event = {
        id: '1',
        organizerProfile: { id: 'other-org', userId: 'other-user' },
      };

      prisma.event.findUnique.mockResolvedValue(event);
      prisma.category.count.mockResolvedValue(0);
      prisma.event.delete.mockResolvedValue(event);

      const result = await service.delete('1', adminUser);

      expect(prisma.event.delete).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(event);
    });

    it('should throw BadRequestException when event has associated categories', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: '1',
        organizerProfile,
      });
      prisma.category.count.mockResolvedValue(3);

      await expect(service.delete('1', user)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.event.delete).not.toHaveBeenCalled();
    });
  });
});
