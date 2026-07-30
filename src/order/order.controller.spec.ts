jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { UserService } from 'src/user/user.service';

const mockOrderService = {
  create: jest.fn(),
};

const mockUserService = {
  findById: jest.fn(),
};

describe('OrderController', () => {
  let controller: OrderController;
  let orderService: typeof mockOrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        { provide: OrderService, useValue: mockOrderService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    orderService = module.get(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call orderService.create with dto and userId', async () => {
      const dto = { items: [{ categoryId: 'cat-uuid', quantity: 2 }] };
      const createdOrder = { id: 'order-uuid', total: 525 };

      mockOrderService.create.mockResolvedValue(createdOrder);

      const result = await controller.create(dto, 'user-uuid');

      expect(orderService.create).toHaveBeenCalledWith(dto, 'user-uuid');
      expect(result).toEqual(createdOrder);
    });
  });
});
