/* eslint-disable @typescript-eslint/no-unsafe-assignment */
class PrismaClientKnownRequestError extends Error {
  code: string;
  constructor(message: string, options: { code: string }) {
    super(message);
    this.name = 'PrismaClientKnownRequestError';
    this.code = options.code;
  }
}

jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

jest.mock('generated/prisma/internal/prismaNamespace', () => ({
  PrismaClientKnownRequestError,
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  TicketStatus,
} from 'generated/prisma/enums';
import { PrismaService } from 'src/prisma.service';
import { PaymentService } from './payment.service';
import { PaymentProviderFactory } from './strategy/payment-provider.factory';

const fakeProvider = {
  name: 'ASAAS',
  createCustomer: jest.fn(),
  createPayment: jest.fn(),
  getPaymentStatus: jest.fn(),
  cancelPayment: jest.fn(),
};

const factoryMock = {
  getProvider: jest.fn(() => fakeProvider),
};

const mockPrisma = {
  gatewayCustomer: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  payment: {
    update: jest.fn(),
  },
  category: {
    update: jest.fn(),
  },
  ticket: {
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrisma.$transaction.mockImplementation(
      (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PaymentProviderFactory, useValue: factoryMock },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('delegation', () => {
    it('createCustomer delegates to the provider', async () => {
      fakeProvider.createCustomer.mockResolvedValue({ externalId: 'cus_1' });
      const input = { name: 'John', email: 'john@email.com' };

      await expect(service.createCustomer(input)).resolves.toEqual({
        externalId: 'cus_1',
      });
      expect(fakeProvider.createCustomer).toHaveBeenCalledWith(input);
    });

    it('createPayment delegates to the provider', async () => {
      fakeProvider.createPayment.mockResolvedValue({
        externalId: 'pay_1',
        status: PaymentStatus.PENDING,
        providerData: {},
        dueDate: new Date(),
      });
      const input = {
        customerExternalId: 'cus_1',
        amount: 100,
        method: PaymentMethod.PIX,
        dueDate: new Date(),
      };

      await expect(service.createPayment(input)).resolves.toEqual(
        expect.objectContaining({ externalId: 'pay_1' }),
      );
      expect(fakeProvider.createPayment).toHaveBeenCalledWith(input);
    });

    it('getPaymentStatus delegates to the provider', async () => {
      fakeProvider.getPaymentStatus.mockResolvedValue(PaymentStatus.APPROVED);

      await expect(service.getPaymentStatus('pay_1')).resolves.toBe(
        PaymentStatus.APPROVED,
      );
      expect(fakeProvider.getPaymentStatus).toHaveBeenCalledWith('pay_1');
    });

    it('cancelPayment delegates to the provider', async () => {
      fakeProvider.cancelPayment.mockResolvedValue(undefined);

      await expect(service.cancelPayment('pay_1')).resolves.toBeUndefined();
      expect(fakeProvider.cancelPayment).toHaveBeenCalledWith('pay_1');
    });
  });

  describe('ensureGatewayCustomer', () => {
    it('returns the existing customer without calling the gateway', async () => {
      mockPrisma.gatewayCustomer.findUnique.mockResolvedValue({
        customerId: 'cus_existing',
      });

      await expect(
        service.ensureGatewayCustomer('user-1', {
          name: 'John',
          email: 'john@email.com',
        }),
      ).resolves.toEqual({ externalId: 'cus_existing' });

      expect(fakeProvider.createCustomer).not.toHaveBeenCalled();
      expect(mockPrisma.gatewayCustomer.create).not.toHaveBeenCalled();
    });

    it('creates a gateway customer and persists it', async () => {
      mockPrisma.gatewayCustomer.findUnique.mockResolvedValue(null);
      fakeProvider.createCustomer.mockResolvedValue({ externalId: 'cus_new' });

      await expect(
        service.ensureGatewayCustomer('user-1', {
          name: 'John',
          email: 'john@email.com',
        }),
      ).resolves.toEqual({ externalId: 'cus_new' });

      expect(fakeProvider.createCustomer).toHaveBeenCalledWith({
        name: 'John',
        email: 'john@email.com',
      });
      expect(mockPrisma.gatewayCustomer.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          provider: 'ASAAS',
          customerId: 'cus_new',
        },
      });
    });

    it('recovers when another request creates the customer concurrently (P2002)', async () => {
      mockPrisma.gatewayCustomer.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ customerId: 'cus_other' });
      fakeProvider.createCustomer.mockResolvedValue({ externalId: 'cus_new' });
      mockPrisma.gatewayCustomer.create.mockRejectedValue(
        new PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
        }),
      );

      await expect(
        service.ensureGatewayCustomer('user-1', {
          name: 'John',
          email: 'john@email.com',
        }),
      ).resolves.toEqual({ externalId: 'cus_other' });
    });

    it('rethrows non-unique errors from create', async () => {
      mockPrisma.gatewayCustomer.findUnique.mockResolvedValue(null);
      fakeProvider.createCustomer.mockResolvedValue({ externalId: 'cus_new' });
      mockPrisma.gatewayCustomer.create.mockRejectedValue(new Error('DB down'));

      await expect(
        service.ensureGatewayCustomer('user-1', {
          name: 'John',
          email: 'john@email.com',
        }),
      ).rejects.toThrow('DB down');
    });
  });

  describe('markOrderPaid', () => {
    it('marks a PENDING order and its payment as paid', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord_1',
        status: OrderStatus.PENDING,
      });

      await service.markOrderPaid('ord_1', 'pay_1');

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay_1' },
        data: { status: PaymentStatus.APPROVED, paidAt: expect.any(Date) },
      });
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'ord_1' },
        data: { status: OrderStatus.PAID },
      });
    });

    it('does nothing when the order is no longer PENDING', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord_1',
        status: OrderStatus.CANCELED,
      });

      await service.markOrderPaid('ord_1', 'pay_1');

      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('does nothing when the order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await service.markOrderPaid('ord_1', 'pay_1');

      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });
  });

  describe('releaseOrder', () => {
    it('releases stock, cancels tickets and updates statuses', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord_1',
        status: OrderStatus.PENDING,
        orderItems: [
          { id: 'oi_1', categoryId: 'cat_1', quantity: 2 },
          { id: 'oi_2', categoryId: 'cat_2', quantity: 1 },
        ],
      });

      await service.releaseOrder(
        'ord_1',
        'pay_1',
        PaymentStatus.FAILED,
        OrderStatus.CANCELED,
      );

      expect(mockPrisma.category.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'cat_1' },
        data: { quantity: { increment: 2 } },
      });
      expect(mockPrisma.category.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'cat_2' },
        data: { quantity: { increment: 1 } },
      });
      expect(mockPrisma.ticket.updateMany).toHaveBeenCalledWith({
        where: { orderItem: { orderId: 'ord_1' } },
        data: { status: TicketStatus.CANCELED },
      });
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay_1' },
        data: { status: PaymentStatus.FAILED },
      });
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'ord_1' },
        data: { status: OrderStatus.CANCELED },
      });
    });

    it('does nothing when the order is no longer PENDING', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord_1',
        status: OrderStatus.PAID,
        orderItems: [],
      });

      await service.releaseOrder(
        'ord_1',
        'pay_1',
        PaymentStatus.FAILED,
        OrderStatus.CANCELED,
      );

      expect(mockPrisma.category.update).not.toHaveBeenCalled();
      expect(mockPrisma.ticket.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });
  });
});
