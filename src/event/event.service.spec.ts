jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventService } from './event.service';
import { PrismaService } from 'src/prisma.service';

const mockPrisma = {
  event: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

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
    it('should create an event linked to the user', async () => {
      const dto = {
        name: 'Show',
        artist: 'Artist',
        date: new Date('2026-12-01'),
        organizer: 'Org',
      };
      const createdEvent = { id: 'uuid', ...dto, userId: 'user-id' };

      prisma.event.create.mockResolvedValue(createdEvent);

      const result = await service.create(dto, 'user-id');

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: { ...dto, userId: 'user-id' },
      });
      expect(result).toEqual(createdEvent);
    });
  });

  describe('findOne', () => {
    it('should return an event when found', async () => {
      const event = {
        id: '1',
        name: 'Show',
        artist: 'Artist',
        date: new Date(),
        organizer: 'Org',
        userId: 'user-id',
      };

      prisma.event.findUnique.mockResolvedValue(event);

      const result = await service.findOne('1');

      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual(event);
    });

    it('should return null when event not found', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      const result = await service.findOne('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update and return event when found', async () => {
      const existingEvent = {
        id: '1',
        name: 'Show',
        artist: 'Artist',
        date: new Date(),
        organizer: 'Org',
        userId: 'user-id',
      };
      const updateDto = { name: 'Updated Show' };

      prisma.event.findUnique.mockResolvedValue(existingEvent);
      prisma.event.update.mockResolvedValue({ ...existingEvent, ...updateDto });

      const result = await service.update('1', updateDto);

      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
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
        service.update('nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete and return event when found', async () => {
      const event = {
        id: '1',
        name: 'Show',
        artist: 'Artist',
        date: new Date(),
        organizer: 'Org',
        userId: 'user-id',
      };

      prisma.event.findUnique.mockResolvedValue(event);
      prisma.event.delete.mockResolvedValue(event);

      const result = await service.delete('1');

      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(prisma.event.delete).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(event);
    });

    it('should throw NotFoundException when event not found', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.event.delete).not.toHaveBeenCalled();
    });
  });
});
