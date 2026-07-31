jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
  EventStatus: {
    DRAFT: 'DRAFT',
    PUBLISHED: 'PUBLISHED',
    FINISHED: 'FINISHED',
    CANCELED: 'CANCELED',
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { UserService } from 'src/user/user.service';

const mockEventService = {
  create: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  updateStatus: jest.fn(),
};

const mockUserService = {
  findById: jest.fn(),
};

const userId = 'user-uuid';

describe('EventController', () => {
  let controller: EventController;
  let eventService: typeof mockEventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventController],
      providers: [
        { provide: EventService, useValue: mockEventService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    controller = module.get<EventController>(EventController);
    eventService = module.get(EventService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call eventService.create with the DTO and userId from CurrentUser', async () => {
      const dto = {
        name: 'Rock in Rio',
        artists: ['Artista'],
        startDate: new Date('2026-12-01'),
        venueId: 'venue-uuid',
      };
      const createdEvent = { id: 'uuid', ...dto, organizerId: userId };

      mockEventService.create.mockResolvedValue(createdEvent);

      const result = await controller.create(dto, userId);

      expect(eventService.create).toHaveBeenCalledWith(dto, userId);
      expect(result).toEqual(createdEvent);
    });
  });

  describe('getAll', () => {
    it('should call eventService.findAll with pagination query', async () => {
      const query = { page: 1, limit: 10 };
      const result = {
        data: [
          {
            id: '1',
            name: 'Rock in Rio',
            venue: { id: 'venue-uuid', name: 'Maracanã' },
            categories: [],
          },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      mockEventService.findAll.mockResolvedValue(result);

      const response = await controller.getAll(query);

      expect(eventService.findAll).toHaveBeenCalledWith(query);
      expect(response).toEqual(result);
    });

    it('should pass filter and sort params to service', async () => {
      const query = {
        name: 'Rock',
        city: 'Rio',
        state: 'RJ',
        sortBy: 'name',
        sortOrder: 'asc' as const,
      };
      const result = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };

      mockEventService.findAll.mockResolvedValue(result);

      await controller.getAll(query);

      expect(eventService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('getById', () => {
    it('should call eventService.findOne with the id', async () => {
      const event = {
        id: '1',
        name: 'Rock in Rio',
        venue: { id: 'venue-uuid', name: 'Maracanã' },
        categories: [],
      };

      mockEventService.findOne.mockResolvedValue(event);

      const result = await controller.getById('1');

      expect(eventService.findOne).toHaveBeenCalledWith('1');
      expect(result).toEqual(event);
    });
  });

  describe('delete', () => {
    it('should call eventService.delete with the id and userId', async () => {
      const event = { id: '1', name: 'Rock in Rio' };

      mockEventService.delete.mockResolvedValue(event);

      const result = await controller.delete('1', userId);

      expect(eventService.delete).toHaveBeenCalledWith('1', userId);
      expect(result).toEqual(event);
    });
  });

  describe('update', () => {
    it('should call eventService.update with id, userId, and DTO', async () => {
      const dto = { name: 'Updated Show' };
      const updatedEvent = {
        id: '1',
        name: 'Updated Show',
        organizerId: userId,
      };

      mockEventService.update.mockResolvedValue(updatedEvent);

      const result = await controller.update('1', dto, userId);

      expect(eventService.update).toHaveBeenCalledWith('1', userId, dto);
      expect(result).toEqual(updatedEvent);
    });
  });

  describe('updateStatus', () => {
    it('should call eventService.updateStatus with id, userId, and status', async () => {
      const dto = { status: 'PUBLISHED' as const };
      const updatedEvent = { id: '1', status: 'PUBLISHED' };

      mockEventService.updateStatus.mockResolvedValue(updatedEvent);

      const result = await controller.updateStatus('1', dto, userId);

      expect(eventService.updateStatus).toHaveBeenCalledWith(
        '1',
        userId,
        'PUBLISHED',
      );
      expect(result).toEqual(updatedEvent);
    });
  });
});
