jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

jest.mock('generated/prisma/internal/prismaNamespace', () => ({
  PrismaClientKnownRequestError: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  OrderStatus,
  PaymentStatus,
  TicketStatus,
} from 'generated/prisma/enums';
import { PrismaService } from 'src/prisma.service';
import { PaymentService } from './payment.service';

const mockPrisma = {
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
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
        data: { status: PaymentStatus.APPROVED, confirmedAt: expect.any(Date) },
      });
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'ord_1' },
        data: { status: OrderStatus.PAID },
      });
    });

    it('does nothing when the order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await service.markOrderPaid('ord_1', 'pay_1');

      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
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
        PaymentStatus.REJECTED,
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
        data: { status: PaymentStatus.REJECTED },
      });
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'ord_1' },
        data: { status: OrderStatus.CANCELED },
      });
    });

    it('does nothing when the order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await service.releaseOrder(
        'ord_1',
        'pay_1',
        PaymentStatus.REJECTED,
        OrderStatus.CANCELED,
      );

      expect(mockPrisma.category.update).not.toHaveBeenCalled();
      expect(mockPrisma.ticket.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
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
        PaymentStatus.REJECTED,
        OrderStatus.CANCELED,
      );

      expect(mockPrisma.category.update).not.toHaveBeenCalled();
      expect(mockPrisma.ticket.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });
  });
});
