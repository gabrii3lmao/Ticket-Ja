jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { VenueService } from './venue.service';
import { PrismaService } from 'src/prisma.service';

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
    it('should create a venue', async () => {
      const dto = {
        name: 'Maracanã',
        capacity: 50000,
        city: 'Rio de Janeiro',
        state: 'RJ',
      };
      const createdVenue = { id: 'uuid', ...dto, createdAt: new Date(), updatedAt: new Date() };

      prisma.venue.create.mockResolvedValue(createdVenue);

      const result = await service.create(dto);

      expect(prisma.venue.create).toHaveBeenCalledWith({ data: dto });
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
  });

  describe('update', () => {
    it('should update and return venue when found', async () => {
      const existingVenue = {
        id: '1',
        name: 'Maracanã',
        capacity: 50000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updateDto = { name: 'Maracanã Reformado' };

      prisma.venue.findUnique.mockResolvedValue(existingVenue);
      prisma.venue.update.mockResolvedValue({ ...existingVenue, ...updateDto });

      const result = await service.update('1', updateDto);

      expect(prisma.venue.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(prisma.venue.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto,
      });
      expect(result.name).toBe('Maracanã Reformado');
    });

    it('should throw NotFoundException when venue not found', async () => {
      prisma.venue.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.venue.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete and return venue when found and no associated events', async () => {
      const venue = {
        id: '1',
        name: 'Maracanã',
        capacity: 50000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.venue.findUnique.mockResolvedValue(venue);
      prisma.event.count.mockResolvedValue(0);
      prisma.venue.delete.mockResolvedValue(venue);

      const result = await service.delete('1');

      expect(prisma.venue.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(prisma.event.count).toHaveBeenCalledWith({
        where: { venueId: '1' },
      });
      expect(prisma.venue.delete).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(venue);
    });

    it('should throw NotFoundException when venue not found', async () => {
      prisma.venue.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.venue.delete).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when venue has associated events', async () => {
      const venue = {
        id: '1',
        name: 'Maracanã',
        capacity: 50000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.venue.findUnique.mockResolvedValue(venue);
      prisma.event.count.mockResolvedValue(3);

      await expect(service.delete('1')).rejects.toThrow(BadRequestException);
      expect(prisma.venue.delete).not.toHaveBeenCalled();
    });
  });
});
