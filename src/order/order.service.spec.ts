jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

class PrismaClientKnownRequestError extends Error {
  code: string;
  constructor(message: string, options: { code: string }) {
    super(message);
    this.name = 'PrismaClientKnownRequestError';
    this.code = options.code;
  }
}

jest.mock('generated/prisma/internal/prismaNamespace', () => ({
  PrismaClientKnownRequestError,
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderService } from './order.service';
import { PrismaService } from 'src/prisma.service';

const mockTx = {
  category: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  order: {
    create: jest.fn(),
  },
  payment: {
    create: jest.fn(),
  },
};

const mockPrisma = {
  $transaction: jest.fn(),
};

const userId = 'user-uuid';

const publishedEvent = {
  id: 'event-uuid',
  name: 'Rock in Rio',
  status: 'PUBLISHED',
  startDate: new Date('2099-01-01'),
};

const baseCategory = {
  id: 'cat-uuid',
  name: 'Pista Premium',
  price: 250,
  quantity: 100,
  salesStart: null,
  salesEnd: null,
  eventId: 'event-uuid',
  event: publishedEvent,
};

const baseCategory2 = {
  ...baseCategory,
  id: 'cat-uuid-2',
  name: 'Camarote',
};

const createDto = {
  items: [{ categoryId: 'cat-uuid', quantity: 2 }],
};

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);

    mockPrisma.$transaction.mockImplementation(
      (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an order with items, tickets and payment', async () => {
      mockTx.category.findMany.mockResolvedValue([baseCategory]);
      mockTx.category.update.mockResolvedValue({
        ...baseCategory,
        quantity: 98,
      });

      const fakeOrder = {
        id: 'order-uuid',
        subtotal: 500,
        discount: 0,
        fee: 25,
        total: 525,
        orderItems: [
          {
            id: 'oi-uuid',
            quantity: 2,
            unitPrice: 250,
            total: 500,
            tickets: [
              {
                code: 'TKT-ABC1',
                qrCode: 'http://localhost:3000/api/ticket/validate/TKT-ABC1',
              },
              {
                code: 'TKT-ABC2',
                qrCode: 'http://localhost:3000/api/ticket/validate/TKT-ABC2',
              },
            ],
          },
        ],
        payments: [],
      };
      mockTx.order.create.mockResolvedValue(fakeOrder);
      mockTx.payment.create.mockResolvedValue({});

      const result = await service.create(createDto, userId);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockTx.category.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['cat-uuid'] } },
        include: { event: true },
      });
      expect(mockTx.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-uuid', quantity: { gte: 2 } },
        data: { quantity: { decrement: 2 } },
      });
      expect(mockTx.order.create).toHaveBeenCalled();
      expect(mockTx.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'order-uuid',
            amount: 525,
            provider: 'ASAAS',
            paymentMethod: 'PIX',
            status: 'PENDING',
          }),
        }),
      );
      expect(result).toEqual(fakeOrder);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockTx.category.findMany.mockResolvedValue([]);

      await expect(service.create(createDto, userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockTx.category.update).not.toHaveBeenCalled();
      expect(mockTx.order.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when sales have not started yet', async () => {
      mockTx.category.findMany.mockResolvedValue([
        {
          ...baseCategory,
          salesStart: new Date(Date.now() + 86400000),
        },
      ]);

      await expect(service.create(createDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockTx.category.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when sales have ended', async () => {
      mockTx.category.findMany.mockResolvedValue([
        {
          ...baseCategory,
          salesEnd: new Date(Date.now() - 86400000),
        },
      ]);

      await expect(service.create(createDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockTx.category.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when the event is not published', async () => {
      mockTx.category.findMany.mockResolvedValue([
        {
          ...baseCategory,
          event: { ...publishedEvent, status: 'DRAFT' },
        },
      ]);

      await expect(service.create(createDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockTx.category.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when the event has already begun', async () => {
      mockTx.category.findMany.mockResolvedValue([
        {
          ...baseCategory,
          event: { ...publishedEvent, startDate: new Date('2000-01-01') },
        },
      ]);

      await expect(service.create(createDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockTx.category.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when stock is insufficient', async () => {
      mockTx.category.findMany.mockResolvedValue([baseCategory]);
      const error = new PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
      });
      mockTx.category.update.mockRejectedValue(error);

      await expect(service.create(createDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockTx.order.create).not.toHaveBeenCalled();
    });

    it('should rethrow unexpected errors from stock decrement', async () => {
      mockTx.category.findMany.mockResolvedValue([baseCategory]);
      const unexpectedError = new Error('DB connection lost');
      mockTx.category.update.mockRejectedValue(unexpectedError);

      await expect(service.create(createDto, userId)).rejects.toThrow(
        'DB connection lost',
      );
      expect(mockTx.order.create).not.toHaveBeenCalled();
    });

    it('should handle multiple items in a single order', async () => {
      mockTx.category.findMany.mockResolvedValue([baseCategory, baseCategory2]);
      mockTx.category.update.mockResolvedValue({
        ...baseCategory,
        quantity: 90,
      });

      const fakeOrder = {
        id: 'order-uuid',
        subtotal: 750,
        discount: 0,
        fee: 37.5,
        total: 787.5,
        orderItems: [
          {
            id: 'oi-1',
            quantity: 2,
            unitPrice: 250,
            total: 500,
            tickets: [
              { code: 'TKT-A', qrCode: 'url' },
              { code: 'TKT-B', qrCode: 'url' },
            ],
          },
          {
            id: 'oi-2',
            quantity: 1,
            unitPrice: 250,
            total: 250,
            tickets: [{ code: 'TKT-C', qrCode: 'url' }],
          },
        ],
      };
      mockTx.order.create.mockResolvedValue(fakeOrder);
      mockTx.payment.create.mockResolvedValue({});

      const multiDto = {
        items: [
          { categoryId: 'cat-uuid', quantity: 2 },
          { categoryId: 'cat-uuid-2', quantity: 1 },
        ],
      };

      const result = await service.create(multiDto, userId);

      expect(mockTx.category.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['cat-uuid', 'cat-uuid-2'] } },
        include: { event: true },
      });
      expect(mockTx.category.update).toHaveBeenCalledTimes(2);
      expect(result).toEqual(fakeOrder);
    });

    it('should aggregate duplicate categoryIds into a single order item', async () => {
      mockTx.category.findMany.mockResolvedValue([baseCategory]);
      mockTx.category.update.mockResolvedValue({
        ...baseCategory,
        quantity: 97,
      });

      const fakeOrder = {
        id: 'order-uuid',
        subtotal: 750,
        discount: 0,
        fee: 37.5,
        total: 787.5,
        orderItems: [
          {
            id: 'oi-1',
            quantity: 3,
            unitPrice: 250,
            total: 750,
            tickets: [
              { code: 'TKT-A', qrCode: 'url' },
              { code: 'TKT-B', qrCode: 'url' },
              { code: 'TKT-C', qrCode: 'url' },
            ],
          },
        ],
      };
      mockTx.order.create.mockResolvedValue(fakeOrder);
      mockTx.payment.create.mockResolvedValue({});

      const dupDto = {
        items: [
          { categoryId: 'cat-uuid', quantity: 2 },
          { categoryId: 'cat-uuid', quantity: 1 },
        ],
      };

      await service.create(dupDto, userId);

      expect(mockTx.category.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['cat-uuid'] } },
        include: { event: true },
      });
      expect(mockTx.category.update).toHaveBeenCalledTimes(1);
      expect(mockTx.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-uuid', quantity: { gte: 3 } },
        data: { quantity: { decrement: 3 } },
      });
    });

    it('should create correct number of tickets per item quantity', async () => {
      mockTx.category.findMany.mockResolvedValue([baseCategory]);
      mockTx.category.update.mockResolvedValue({
        ...baseCategory,
        quantity: 95,
      });

      mockTx.order.create.mockImplementation(({ data }) => ({
        id: 'order-uuid',
        subtotal: data.subtotal,
        discount: data.discount,
        fee: data.fee,
        total: data.total,
        orderItems: data.orderItems.create.map(
          (item: { tickets: { create: unknown[] }; quantity: number }) => ({
            quantity: item.quantity,
            tickets: item.tickets.create.map((_: unknown, i: number) => ({
              code: `TKT-${i}`,
              qrCode: `http://localhost:3000/api/ticket/validate/TKT-${i}`,
            })),
          }),
        ),
      }));
      mockTx.payment.create.mockResolvedValue({});

      const result = await service.create(createDto, userId);

      expect(result.orderItems[0].tickets).toHaveLength(2);
    });
  });

  describe('create - date boundaries', () => {
    const SYSTEM_TIME = new Date('2026-06-01T12:00:00.000Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(SYSTEM_TIME);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create an order when salesStart equals now', async () => {
      mockTx.category.findMany.mockResolvedValue([
        {
          ...baseCategory,
          salesStart: new Date(SYSTEM_TIME),
        },
      ]);
      mockTx.category.update.mockResolvedValue({
        ...baseCategory,
        quantity: 98,
      });
      mockTx.order.create.mockResolvedValue({ id: 'order-uuid', total: 525 });
      mockTx.payment.create.mockResolvedValue({});

      await expect(service.create(createDto, userId)).resolves.toBeDefined();

      expect(mockTx.order.create).toHaveBeenCalled();
      expect(mockTx.payment.create).toHaveBeenCalled();
    });

    it('should create an order when salesEnd equals now', async () => {
      mockTx.category.findMany.mockResolvedValue([
        {
          ...baseCategory,
          salesEnd: new Date(SYSTEM_TIME),
        },
      ]);
      mockTx.category.update.mockResolvedValue({
        ...baseCategory,
        quantity: 98,
      });
      mockTx.order.create.mockResolvedValue({ id: 'order-uuid', total: 525 });
      mockTx.payment.create.mockResolvedValue({});

      await expect(service.create(createDto, userId)).resolves.toBeDefined();

      expect(mockTx.order.create).toHaveBeenCalled();
      expect(mockTx.payment.create).toHaveBeenCalled();
    });

    it('should create an order when event.startDate equals now', async () => {
      mockTx.category.findMany.mockResolvedValue([
        {
          ...baseCategory,
          event: { ...publishedEvent, startDate: new Date(SYSTEM_TIME) },
        },
      ]);
      mockTx.category.update.mockResolvedValue({
        ...baseCategory,
        quantity: 98,
      });
      mockTx.order.create.mockResolvedValue({ id: 'order-uuid', total: 525 });
      mockTx.payment.create.mockResolvedValue({});

      await expect(service.create(createDto, userId)).resolves.toBeDefined();

      expect(mockTx.order.create).toHaveBeenCalled();
      expect(mockTx.payment.create).toHaveBeenCalled();
    });
  });

  describe('create - partial failure', () => {
    it('should not create order or payment when a later item runs out of stock', async () => {
      mockTx.category.findMany.mockResolvedValue([baseCategory, baseCategory2]);
      mockTx.category.update
        .mockResolvedValueOnce({ ...baseCategory, quantity: 98 })
        .mockRejectedValueOnce(
          new PrismaClientKnownRequestError('Record not found', {
            code: 'P2025',
          }),
        );

      const multiDto = {
        items: [
          { categoryId: 'cat-uuid', quantity: 2 },
          { categoryId: 'cat-uuid-2', quantity: 1 },
        ],
      };

      await expect(service.create(multiDto, userId)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockTx.category.update).toHaveBeenCalledTimes(2);
      expect(mockTx.order.create).not.toHaveBeenCalled();
      expect(mockTx.payment.create).not.toHaveBeenCalled();
    });
  });
});
