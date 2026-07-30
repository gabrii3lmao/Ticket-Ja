jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { UserService } from 'src/user/user.service';

const mockCategoryService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockUserService = {
  findById: jest.fn(),
};

const eventId = 'event-uuid';
const userId = 'user-uuid';

describe('CategoryController', () => {
  let controller: CategoryController;
  let categoryService: typeof mockCategoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
    categoryService = module.get(CategoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call categoryService.create with eventId, DTO, and userId', async () => {
      const dto = { name: 'Pista Premium', price: 250, quantity: 1000 };
      const createdCategory = {
        id: 'uuid',
        ...dto,
        eventId,
        createdAt: new Date(),
      };

      mockCategoryService.create.mockResolvedValue(createdCategory);

      const result = await controller.create(eventId, dto, userId);

      expect(categoryService.create).toHaveBeenCalledWith(dto, eventId, userId);
      expect(result).toEqual(createdCategory);
    });
  });

  describe('findAll', () => {
    it('should call categoryService.findAll with query and eventId', async () => {
      const query = { page: 1, limit: 10 };
      const result = {
        data: [
          {
            id: '1',
            name: 'Pista Premium',
            price: 250,
            quantity: 1000,
            eventId,
            createdAt: new Date(),
          },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      mockCategoryService.findAll.mockResolvedValue(result);

      const response = await controller.findAll(eventId, query);

      expect(categoryService.findAll).toHaveBeenCalledWith(query, eventId);
      expect(response).toEqual(result);
    });

    it('should pass filter and sort params to service', async () => {
      const query = {
        name: 'Pista',
        minPrice: 50,
        maxPrice: 500,
        sortBy: 'price',
        sortOrder: 'asc',
      };
      const result = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };

      mockCategoryService.findAll.mockResolvedValue(result);

      await controller.findAll(eventId, query);

      expect(categoryService.findAll).toHaveBeenCalledWith(query, eventId);
    });
  });

  describe('findOne', () => {
    it('should call categoryService.findOne with the id', async () => {
      const category = {
        id: '1',
        name: 'Pista Premium',
        price: 250,
        quantity: 1000,
        eventId,
        createdAt: new Date(),
      };

      mockCategoryService.findOne.mockResolvedValue(category);

      const result = await controller.findOne('1');

      expect(categoryService.findOne).toHaveBeenCalledWith('1');
      expect(result).toEqual(category);
    });
  });

  describe('update', () => {
    it('should call categoryService.update with id, userId and DTO', async () => {
      const dto = { name: 'Pista VIP' };
      const updatedCategory = {
        id: '1',
        name: 'Pista VIP',
        price: 250,
        quantity: 1000,
        eventId,
        createdAt: new Date(),
      };

      mockCategoryService.update.mockResolvedValue(updatedCategory);

      const result = await controller.update('1', dto, userId);

      expect(categoryService.update).toHaveBeenCalledWith('1', userId, dto);
      expect(result).toEqual(updatedCategory);
    });
  });

  describe('remove', () => {
    it('should call categoryService.remove with id and userId', async () => {
      const category = {
        id: '1',
        name: 'Pista Premium',
        price: 250,
        quantity: 1000,
        eventId,
        createdAt: new Date(),
      };

      mockCategoryService.remove.mockResolvedValue(category);

      const result = await controller.remove('1', userId);

      expect(categoryService.remove).toHaveBeenCalledWith('1', userId);
      expect(result).toEqual(category);
    });
  });
});
