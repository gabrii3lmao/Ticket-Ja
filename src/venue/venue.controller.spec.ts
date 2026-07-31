jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { VenueController } from './venue.controller';
import { VenueService } from './venue.service';
import { ActiveUserPipe } from 'src/auth/pipes/active-user.pipe';
import { UserService } from 'src/user/user.service';

const userId = 'user-uuid';

const mockVenueService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockUserService = {
  findById: jest.fn(),
};

describe('VenueController', () => {
  let controller: VenueController;
  let venueService: typeof mockVenueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VenueController],
      providers: [
        { provide: VenueService, useValue: mockVenueService },
        { provide: UserService, useValue: mockUserService },
        ActiveUserPipe,
      ],
    }).compile();

    controller = module.get<VenueController>(VenueController);
    venueService = module.get(VenueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call venueService.create with the DTO and userId', async () => {
      const dto = {
        name: 'Maracanã',
        capacity: 50000,
        city: 'Rio de Janeiro',
        state: 'RJ',
      };
      const createdVenue = {
        id: 'uuid',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockVenueService.create.mockResolvedValue(createdVenue);

      const result = await controller.create(dto, userId);

      expect(venueService.create).toHaveBeenCalledWith(dto, userId);
      expect(result).toEqual(createdVenue);
    });
  });

  describe('findAll', () => {
    it('should call venueService.findAll with query', async () => {
      const query = { page: 1, limit: 10 };
      const result = {
        data: [
          {
            id: '1',
            name: 'Maracanã',
            capacity: 50000,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      mockVenueService.findAll.mockResolvedValue(result);

      const response = await controller.findAll(query);

      expect(venueService.findAll).toHaveBeenCalledWith(query);
      expect(response).toEqual(result);
    });

    it('should pass filter and sort params to service', async () => {
      const query = {
        name: 'Mara',
        city: 'Rio',
        state: 'RJ',
        minCapacity: 1000,
        sortBy: 'name',
        sortOrder: 'asc' as const,
      };
      const result = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };

      mockVenueService.findAll.mockResolvedValue(result);

      await controller.findAll(query);

      expect(venueService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should call venueService.findOne with the id', async () => {
      const venue = {
        id: '1',
        name: 'Maracanã',
        capacity: 50000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockVenueService.findOne.mockResolvedValue(venue);

      const result = await controller.findOne('1');

      expect(venueService.findOne).toHaveBeenCalledWith('1');
      expect(result).toEqual(venue);
    });
  });

  describe('update', () => {
    it('should call venueService.update with id, userId and DTO', async () => {
      const dto = { name: 'Maracanã Reformado' };
      const updatedVenue = {
        id: '1',
        name: 'Maracanã Reformado',
        capacity: 50000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockVenueService.update.mockResolvedValue(updatedVenue);

      const result = await controller.update('1', dto, userId);

      expect(venueService.update).toHaveBeenCalledWith('1', userId, dto);
      expect(result).toEqual(updatedVenue);
    });
  });

  describe('delete', () => {
    it('should call venueService.delete with id and userId', async () => {
      const venue = {
        id: '1',
        name: 'Maracanã',
        capacity: 50000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockVenueService.delete.mockResolvedValue(venue);

      const result = await controller.delete('1', userId);

      expect(venueService.delete).toHaveBeenCalledWith('1', userId);
      expect(result).toEqual(venue);
    });
  });
});
