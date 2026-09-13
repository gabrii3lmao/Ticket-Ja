jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentStatus } from 'generated/prisma/enums';
import { OrderExpirationService } from './order-expiration.service';
import { PrismaService } from 'src/prisma.service';
import { PaymentService } from 'src/payment/payment.service';

const mockPrisma = {
  order: {
    findMany: jest.fn(),
  },
};

const mockPaymentService = {
  releaseOrder: jest.fn(),
};

describe('OrderExpirationService', () => {
  let service: OrderExpirationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderExpirationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaymentService, useValue: mockPaymentService },
      ],
    }).compile();

    service = module.get<OrderExpirationService>(OrderExpirationService);
  });

  describe('expirePendingReservations', () => {
    it('should release expired pending orders and return the count', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        { id: 'order-1', payment: { id: 'pay-1' } },
        { id: 'order-2', payment: { id: 'pay-2' } },
      ]);
      mockPaymentService.releaseOrder.mockResolvedValue(undefined);

      const result = await service.expirePendingReservations();

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: {
          status: OrderStatus.PENDING,
          reservedUntil: { lte: expect.any(Date) },
          payment: { isNot: null },
        },
        include: { payment: true },
      });
      expect(mockPaymentService.releaseOrder).toHaveBeenCalledTimes(2);
      expect(mockPaymentService.releaseOrder).toHaveBeenNthCalledWith(
        1,
        'order-1',
        'pay-1',
        PaymentStatus.REJECTED,
        OrderStatus.CANCELED,
        'Reservation TTL expired',
      );
      expect(mockPaymentService.releaseOrder).toHaveBeenNthCalledWith(
        2,
        'order-2',
        'pay-2',
        PaymentStatus.REJECTED,
        OrderStatus.CANCELED,
        'Reservation TTL expired',
      );
      expect(result).toBe(2);
    });

    it('should do nothing and return 0 when there are no expired orders', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await service.expirePendingReservations();

      expect(mockPaymentService.releaseOrder).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });
  });
});
