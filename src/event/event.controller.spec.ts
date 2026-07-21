jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { UserService } from 'src/user/user.service';

const mockEventService = {
  create: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  findManyByUserId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockUserService = {
  findById: jest.fn(),
};

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
      const dto = { name: 'Show', artist: 'Artist', date: new Date('2026-12-01'), organizer: 'Org' };
      const userId = 'user-id';
      const createdEvent = { id: 'uuid', ...dto, userId };

      mockEventService.create.mockResolvedValue(createdEvent);

      const result = await controller.create(dto as any, userId);

      expect(eventService.create).toHaveBeenCalledWith(dto, userId);
      expect(result).toEqual(createdEvent);
    });
  });

  describe('getAll', () => {
    it('should call eventService.findAll', async () => {
      const events = [{ id: '1', name: 'Show', artist: 'Artist', date: new Date(), organizer: 'Org', userId: 'user-id' }];

      mockEventService.findAll.mockResolvedValue(events);

      const result = await controller.getAll();

      expect(eventService.findAll).toHaveBeenCalledWith();
      expect(result).toEqual(events);
    });
  });

  describe('getById', () => {
    it('should call eventService.findOne with the id', async () => {
      const event = { id: '1', name: 'Show', artist: 'Artist', date: new Date(), organizer: 'Org', userId: 'user-id' };

      mockEventService.findOne.mockResolvedValue(event);

      const result = await controller.getById('1');

      expect(eventService.findOne).toHaveBeenCalledWith('1');
      expect(result).toEqual(event);
    });
  });

  describe('delete', () => {
    it('should call eventService.delete with the id', async () => {
      const event = { id: '1', name: 'Show', artist: 'Artist', date: new Date(), organizer: 'Org', userId: 'user-id' };

      mockEventService.delete.mockResolvedValue(event);

      const result = await controller.delete('1');

      expect(eventService.delete).toHaveBeenCalledWith('1');
      expect(result).toEqual(event);
    });
  });

  describe('update', () => {
    it('should call eventService.update with the id and DTO', async () => {
      const dto = { name: 'Updated Show' };
      const updatedEvent = { id: '1', name: 'Updated Show', artist: 'Artist', date: new Date(), organizer: 'Org', userId: 'user-id' };

      mockEventService.update.mockResolvedValue(updatedEvent);

      const result = await controller.update('1', dto as any);

      expect(eventService.update).toHaveBeenCalledWith('1', dto);
      expect(result).toEqual(updatedEvent);
    });
  });
});
