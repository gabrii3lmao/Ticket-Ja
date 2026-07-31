jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
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
};

const userId = 'user-uuid';

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
    it('should create an event linked to the user when the venue belongs to them', async () => {
      const dto = {
        name: 'Rock in Rio',
        artists: ['Artista'],
        startDate: new Date('2026-12-01'),
        venueId: 'venue-uuid',
      };
      const createdEvent = { id: 'uuid', ...dto, organizerId: userId };

      prisma.venue.findUnique.mockResolvedValue({
        id: 'venue-uuid',
        organizerId: userId,
      });
      prisma.event.create.mockResolvedValue(createdEvent);

      const result = await service.create(dto, userId);

      expect(prisma.venue.findUnique).toHaveBeenCalledWith({
        where: { id: 'venue-uuid' },
      });
      expect(prisma.event.create).toHaveBeenCalledWith({
        data: { ...dto, organizerId: userId },
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

      await expect(service.create(dto, userId)).rejects.toThrow(
        BadRequestException,
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

      prisma.venue.findUnique.mockResolvedValue(null);

      await expect(service.create(dto, userId)).rejects.toThrow(
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

      prisma.venue.findUnique.mockResolvedValue({
        id: 'venue-uuid',
        organizerId: 'other-user',
      });

      await expect(service.create(dto, userId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.event.create).not.toHaveBeenCalled();
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
  });

  describe('update', () => {
    it('should update and return event when user is the organizer', async () => {
      const existingEvent = {
        id: '1',
        name: 'Rock in Rio',
        organizerId: userId,
      };
      const updateDto = { name: 'Updated Show' };

      prisma.event.findUnique.mockResolvedValue(existingEvent);
      prisma.event.update.mockResolvedValue({ ...existingEvent, ...updateDto });

      const result = await service.update('1', userId, updateDto);

      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto,
      });
      expect(result.name).toBe('Updated Show');
    });

    it('should throw NotFoundException when event not found or not owned', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', userId, { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not the organizer', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: '1',
        organizerId: 'other-user',
      });

      await expect(
        service.update('1', userId, { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when endDate is before the existing startDate', async () => {
      const existingEvent = {
        id: '1',
        name: 'Rock in Rio',
        startDate: new Date('2026-12-01'),
        organizerId: userId,
      };

      prisma.event.findUnique.mockResolvedValue(existingEvent);

      await expect(
        service.update('1', userId, { endDate: new Date('2026-11-01') }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when changing to a nonexistent venue', async () => {
      const existingEvent = {
        id: '1',
        name: 'Rock in Rio',
        organizerId: userId,
      };

      prisma.event.findUnique.mockResolvedValue(existingEvent);
      prisma.venue.findUnique.mockResolvedValue(null);

      await expect(
        service.update('1', userId, { venueId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when changing to a venue of another user', async () => {
      const existingEvent = {
        id: '1',
        name: 'Rock in Rio',
        organizerId: userId,
      };

      prisma.event.findUnique.mockResolvedValue(existingEvent);
      prisma.venue.findUnique.mockResolvedValue({
        id: 'venue-uuid',
        organizerId: 'other-user',
      });

      await expect(
        service.update('1', userId, { venueId: 'venue-uuid' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('should allow changing venueId when the venue belongs to the user', async () => {
      const existingEvent = {
        id: '1',
        name: 'Rock in Rio',
        organizerId: userId,
      };
      const updateDto = { venueId: 'new-venue' };

      prisma.event.findUnique.mockResolvedValue(existingEvent);
      prisma.venue.findUnique.mockResolvedValue({
        id: 'new-venue',
        organizerId: userId,
      });
      prisma.event.update.mockResolvedValue({ ...existingEvent, ...updateDto });

      const result = await service.update('1', userId, updateDto);

      expect(prisma.venue.findUnique).toHaveBeenCalledWith({
        where: { id: 'new-venue' },
      });
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto,
      });
      expect(result.venueId).toBe('new-venue');
    });
  });

  describe('updateStatus', () => {
    it('should publish an event that has categories', async () => {
      const event = { id: '1', status: 'DRAFT', organizerId: userId };

      prisma.event.findUnique.mockResolvedValue(event);
      prisma.category.count.mockResolvedValue(2);
      prisma.event.update.mockResolvedValue({ ...event, status: 'PUBLISHED' });

      const result = await service.updateStatus('1', userId, 'PUBLISHED');

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
      const event = { id: '1', status: 'DRAFT', organizerId: userId };

      prisma.event.findUnique.mockResolvedValue(event);
      prisma.category.count.mockResolvedValue(0);

      await expect(
        service.updateStatus('1', userId, 'PUBLISHED'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException on an invalid transition', async () => {
      const event = { id: '1', status: 'DRAFT', organizerId: userId };

      prisma.event.findUnique.mockResolvedValue(event);

      await expect(
        service.updateStatus('1', userId, 'FINISHED'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when transitioning out of CANCELED', async () => {
      const event = { id: '1', status: 'CANCELED', organizerId: userId };

      prisma.event.findUnique.mockResolvedValue(event);

      await expect(
        service.updateStatus('1', userId, 'PUBLISHED'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when event not found', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('1', userId, 'PUBLISHED'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not the organizer', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        organizerId: 'other-user',
      });

      await expect(
        service.updateStatus('1', userId, 'PUBLISHED'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete and return event when user is the organizer', async () => {
      const event = { id: '1', name: 'Rock in Rio', organizerId: userId };

      prisma.event.findUnique.mockResolvedValue(event);
      prisma.category.count.mockResolvedValue(0);
      prisma.event.delete.mockResolvedValue(event);

      const result = await service.delete('1', userId);

      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(prisma.category.count).toHaveBeenCalledWith({
        where: { eventId: '1' },
      });
      expect(prisma.event.delete).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(event);
    });

    it('should throw NotFoundException when event not found', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent', userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.event.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not the organizer', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: '1',
        organizerId: 'other-user',
      });

      await expect(service.delete('1', userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.event.delete).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when event has associated categories', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: '1',
        organizerId: userId,
      });
      prisma.category.count.mockResolvedValue(3);

      await expect(service.delete('1', userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.event.delete).not.toHaveBeenCalled();
    });
  });
});
