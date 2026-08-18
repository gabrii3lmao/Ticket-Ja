/* eslint-disable @typescript-eslint/no-unsafe-assignment */
jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { PaymentExpiryService } from './payment-expiry.service';
import { PrismaService } from 'src/prisma.service';
import { PaymentService } from './payment.service';
import { OrderStatus, PaymentStatus } from 'generated/prisma/enums';

const mockPrisma = {
  payment: {
    findMany: jest.fn(),
  },
};

const paymentServiceMock = {
  cancelPayment: jest.fn(),
  releaseOrder: jest.fn(),
};

describe('PaymentExpiryService', () => {
  let service: PaymentExpiryService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentExpiryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaymentService, useValue: paymentServiceMock },
      ],
    }).compile();

    service = module.get<PaymentExpiryService>(PaymentExpiryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should query pending payments with expired due dates and pending orders', async () => {
    mockPrisma.payment.findMany.mockResolvedValue([]);

    await service.expirePendingPayments();

    expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: PaymentStatus.PENDING,
          dueDate: { lt: expect.any(Date) },
          order: { status: OrderStatus.PENDING },
        }),
      }),
    );
  });

  it('should cancel the expired charge at the gateway and release the order', async () => {
    mockPrisma.payment.findMany.mockResolvedValue([
      {
        id: 'pay_1',
        orderId: 'ord_1',
        externalId: 'ext_1',
        status: PaymentStatus.PENDING,
        order: { id: 'ord_1', status: OrderStatus.PENDING },
      },
    ]);

    await service.expirePendingPayments();

    expect(paymentServiceMock.cancelPayment).toHaveBeenCalledWith('ext_1');
    expect(paymentServiceMock.releaseOrder).toHaveBeenCalledWith(
      'ord_1',
      'pay_1',
      PaymentStatus.FAILED,
      OrderStatus.CANCELED,
    );
  });

  it('should skip the gateway cancel without an externalId but still release', async () => {
    mockPrisma.payment.findMany.mockResolvedValue([
      {
        id: 'pay_2',
        orderId: 'ord_2',
        externalId: null,
        status: PaymentStatus.PENDING,
        order: { id: 'ord_2', status: OrderStatus.PENDING },
      },
    ]);

    await service.expirePendingPayments();

    expect(paymentServiceMock.cancelPayment).not.toHaveBeenCalled();
    expect(paymentServiceMock.releaseOrder).toHaveBeenCalledWith(
      'ord_2',
      'pay_2',
      PaymentStatus.FAILED,
      OrderStatus.CANCELED,
    );
  });

  it('should keep going when the gateway cancel fails', async () => {
    mockPrisma.payment.findMany.mockResolvedValue([
      {
        id: 'pay_3',
        orderId: 'ord_3',
        externalId: 'ext_3',
        status: PaymentStatus.PENDING,
        order: { id: 'ord_3', status: OrderStatus.PENDING },
      },
    ]);
    paymentServiceMock.cancelPayment.mockRejectedValue(
      new Error('gateway down'),
    );

    await expect(service.expirePendingPayments()).resolves.toBeUndefined();
    expect(paymentServiceMock.releaseOrder).toHaveBeenCalledWith(
      'ord_3',
      'pay_3',
      PaymentStatus.FAILED,
      OrderStatus.CANCELED,
    );
  });
});
