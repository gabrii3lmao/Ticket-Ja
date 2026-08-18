class mockDecimal {
  private value: number;
  constructor(value: string | number) {
    this.value = Number(value);
  }
  plus(other: mockDecimal | number | string) {
    return new mockDecimal(this.value + Number(other));
  }
  times(other: mockDecimal | number | string) {
    return new mockDecimal(this.value * Number(other));
  }
  toDecimalPlaces() {
    return new mockDecimal(Math.round(this.value * 100) / 100);
  }
  toNumber() {
    return this.value;
  }
  toString() {
    return String(this.value);
  }
}

class PrismaClientKnownRequestError extends Error {
  code: string;
  constructor(message: string, options: { code: string }) {
    super(message);
    this.name = 'PrismaClientKnownRequestError';
    this.code = options.code;
  }
}

jest.mock('generated/prisma/client', () => ({
  Prisma: { Decimal: mockDecimal },
  PrismaClient: class {},
  PaymentProvider: {
    ASAAS: 'ASAAS',
    STRIPE: 'STRIPE',
    MERCADO_PAGO: 'MERCADO_PAGO',
    PAGSEGURO: 'PAGSEGURO',
  },
  PaymentMethod: {
    PIX: 'PIX',
    CREDIT_CARD: 'CREDIT_CARD',
    DEBIT_CARD: 'DEBIT_CARD',
    BOLETO: 'BOLETO',
  },
  PaymentStatus: {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED',
  },
}));

jest.mock('generated/prisma/internal/prismaNamespace', () => ({
  Decimal: mockDecimal,
  PrismaClientKnownRequestError,
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { PrismaService } from 'src/prisma.service';
import { PaymentService } from 'src/payment/payment.service';

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
  user: {
    findUnique: jest.fn(),
  },
  payment: {
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

const paymentServiceMock = {
  ensureGatewayCustomer: jest.fn(),
  createPayment: jest.fn(),
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
  price: new mockDecimal(250),
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
        { provide: PaymentService, useValue: paymentServiceMock },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);

    mockPrisma.$transaction.mockImplementation(
      (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
    );
    mockPrisma.user.findUnique.mockResolvedValue({
      id: userId,
      name: 'John Doe',
      email: 'john@email.com',
      taxId: null,
    });
    mockPrisma.payment.update.mockResolvedValue({
      id: 'pay-uuid',
      externalId: 'pay_test',
      providerData: { pixCopiaECola: '000201...' },
      dueDate: new Date(),
      status: 'PENDING',
    });
    paymentServiceMock.ensureGatewayCustomer.mockResolvedValue({
      externalId: 'cus_test',
    });
    paymentServiceMock.createPayment.mockResolvedValue({
      externalId: 'pay_test',
      status: 'PENDING',
      providerData: { pixCopiaECola: '000201...' },
      dueDate: new Date(),
    });
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
        total: new mockDecimal(525),
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
      mockTx.payment.create.mockResolvedValue({ id: 'pay-uuid' });

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
            provider: 'ASAAS',
            paymentMethod: 'PIX',
            status: 'PENDING',
          }),
        }),
      );
      expect(result).toEqual({
        ...fakeOrder,
        payment: expect.objectContaining({
          id: 'pay-uuid',
          externalId: 'pay_test',
        }),
      });
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
        total: new mockDecimal(787.5),
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
      mockTx.payment.create.mockResolvedValue({ id: 'pay-uuid' });

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
      expect(result).toEqual({
        ...fakeOrder,
        payment: expect.objectContaining({ externalId: 'pay_test' }),
      });
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
        total: new mockDecimal(787.5),
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
      mockTx.payment.create.mockResolvedValue({ id: 'pay-uuid' });

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
      mockTx.payment.create.mockResolvedValue({ id: 'pay-uuid' });

      const result = (await service.create(createDto, userId)) as any;
      expect(result.orderItems[0].tickets).toHaveLength(2);
    });

    it('should round fee to 2 decimal places and keep total consistent', async () => {
      const fractionalCategory = {
        ...baseCategory,
        price: new mockDecimal(33.33),
      };
      mockTx.category.findMany.mockResolvedValue([fractionalCategory]);
      mockTx.category.update.mockResolvedValue({
        ...fractionalCategory,
        quantity: 99,
      });

      let capturedData: any;
      mockTx.order.create.mockImplementation(({ data }) => {
        capturedData = data;
        return {
          id: 'order-uuid',
          subtotal: data.subtotal,
          discount: data.discount,
          fee: data.fee,
          total: data.total,
          orderItems: data.orderItems.create.map(
            (item: { tickets: { create: unknown[] }; quantity: number }) => ({
              quantity: item.quantity,
              tickets: [],
            }),
          ),
        };
      });
      mockTx.payment.create.mockResolvedValue({ id: 'pay-uuid' });

      await service.create(createDto, userId);

      expect(capturedData.subtotal.toNumber()).toBe(66.66);
      expect(capturedData.fee.toNumber()).toBe(3.33);
      expect(capturedData.total.toNumber()).toBe(69.99);
      expect(capturedData.orderItems.create[0].total.toNumber()).toBe(66.66);
      expect(mockTx.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amount: capturedData.total }),
        }),
      );
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
      mockTx.order.create.mockResolvedValue({
        id: 'order-uuid',
        total: new mockDecimal(525),
      });
      mockTx.payment.create.mockResolvedValue({ id: 'pay-uuid' });

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
      mockTx.order.create.mockResolvedValue({
        id: 'order-uuid',
        total: new mockDecimal(525),
      });
      mockTx.payment.create.mockResolvedValue({ id: 'pay-uuid' });

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
      mockTx.order.create.mockResolvedValue({
        id: 'order-uuid',
        total: new mockDecimal(525),
      });
      mockTx.payment.create.mockResolvedValue({ id: 'pay-uuid' });

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

  describe('create - payment gateway integration', () => {
    it('should call the gateway and attach the payment with provider data', async () => {
      mockTx.category.findMany.mockResolvedValue([baseCategory]);
      mockTx.category.update.mockResolvedValue({
        ...baseCategory,
        quantity: 98,
      });
      mockTx.order.create.mockResolvedValue({
        id: 'order-uuid',
        subtotal: 500,
        discount: 0,
        fee: 25,
        total: new mockDecimal(525),
        orderItems: [],
      });
      mockTx.payment.create.mockResolvedValue({ id: 'pay-uuid' });

      const result = (await service.create(createDto, userId)) as {
        payment: { externalId: string | null };
      };

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(paymentServiceMock.ensureGatewayCustomer).toHaveBeenCalledWith(
        userId,
        {
          name: 'John Doe',
          email: 'john@email.com',
          taxId: undefined,
        },
      );
      expect(paymentServiceMock.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          customerExternalId: 'cus_test',
          amount: 525,
          method: 'PIX',
        }),
      );
      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-uuid' },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            externalId: 'pay_test',
            status: 'PENDING',
          }),
        }),
      );
      expect(result.payment.externalId).toBe('pay_test');
    });

    it('should throw NotFoundException when the user does not exist', async () => {
      mockTx.category.findMany.mockResolvedValue([baseCategory]);
      mockTx.category.update.mockResolvedValue({
        ...baseCategory,
        quantity: 98,
      });
      mockTx.order.create.mockResolvedValue({ id: 'order-uuid' });
      mockTx.payment.create.mockResolvedValue({ id: 'pay-uuid' });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(paymentServiceMock.ensureGatewayCustomer).not.toHaveBeenCalled();
    });

    it('should throw BadGatewayException when the gateway fails', async () => {
      mockTx.category.findMany.mockResolvedValue([baseCategory]);
      mockTx.category.update.mockResolvedValue({
        ...baseCategory,
        quantity: 98,
      });
      mockTx.order.create.mockResolvedValue({ id: 'order-uuid' });
      mockTx.payment.create.mockResolvedValue({ id: 'pay-uuid' });
      paymentServiceMock.ensureGatewayCustomer.mockRejectedValue(
        new Error('gateway down'),
      );

      await expect(service.create(createDto, userId)).rejects.toThrow(
        BadGatewayException,
      );
    });
  });
});
