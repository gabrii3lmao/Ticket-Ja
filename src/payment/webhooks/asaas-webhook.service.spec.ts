/* eslint-disable @typescript-eslint/no-unsafe-assignment */
jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AsaasWebhookService } from './asaas-webhook.service';
import { PrismaService } from 'src/prisma.service';
import { PaymentService } from '../payment.service';
import { OrderStatus, PaymentStatus } from 'generated/prisma/enums';

const mockPrisma = {
  paymentWebhookEvent: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  payment: {
    findFirst: jest.fn(),
  },
};

const paymentServiceMock = {
  markOrderPaid: jest.fn(),
  releaseOrder: jest.fn(),
};

describe('AsaasWebhookService', () => {
  let service: AsaasWebhookService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsaasWebhookService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaymentService, useValue: paymentServiceMock },
      ],
    }).compile();

    service = module.get<AsaasWebhookService>(AsaasWebhookService);
  });

  const payment = { id: 'pay_uuid', orderId: 'order_uuid' };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject payloads without event or payment id', async () => {
    await expect(service.handleWebhook({})).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.handleWebhook({ event: 'PAYMENT_RECEIVED' }),
    ).rejects.toThrow(BadRequestException);
    await expect(service.handleWebhook({ payment })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should ignore duplicate events', async () => {
    mockPrisma.paymentWebhookEvent.findUnique.mockResolvedValue({
      id: 'evt',
    });

    const result = await service.handleWebhook({
      event: 'PAYMENT_RECEIVED',
      payment,
    });

    expect(result).toEqual({
      received: true,
      processed: false,
      reason: 'duplicate',
    });
    expect(paymentServiceMock.markOrderPaid).not.toHaveBeenCalled();
    expect(mockPrisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
  });

  it('should record orphan events without applying transitions', async () => {
    mockPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
    mockPrisma.payment.findFirst.mockResolvedValue(null);

    const result = await service.handleWebhook({
      event: 'PAYMENT_RECEIVED',
      payment,
    });

    expect(result).toEqual({
      received: true,
      processed: false,
      reason: 'payment_not_found',
    });
    expect(mockPrisma.paymentWebhookEvent.create).toHaveBeenCalled();
    expect(paymentServiceMock.markOrderPaid).not.toHaveBeenCalled();
  });

  it.each(['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'])(
    'should mark the order as paid on %s',
    async (event) => {
      mockPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.payment.findFirst.mockResolvedValue(payment);

      const result = await service.handleWebhook({ event, payment });

      expect(result).toEqual({ received: true, processed: true });
      expect(paymentServiceMock.markOrderPaid).toHaveBeenCalledWith(
        'order_uuid',
        'pay_uuid',
      );
      expect(mockPrisma.paymentWebhookEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            provider: 'ASAAS',
            eventId: `pay_uuid:${event}`,
          }),
        }),
      );
    },
  );

  it.each(['PAYMENT_OVERDUE', 'PAYMENT_CANCELED', 'PAYMENT_FAILED'])(
    'should release and cancel the order on %s',
    async (event) => {
      mockPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.payment.findFirst.mockResolvedValue(payment);

      await service.handleWebhook({ event, payment });

      expect(paymentServiceMock.releaseOrder).toHaveBeenCalledWith(
        'order_uuid',
        'pay_uuid',
        PaymentStatus.FAILED,
        OrderStatus.CANCELED,
      );
    },
  );

  it.each(['PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED'])(
    'should release and refund the order on %s',
    async (event) => {
      mockPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.payment.findFirst.mockResolvedValue(payment);

      await service.handleWebhook({ event, payment });

      expect(paymentServiceMock.releaseOrder).toHaveBeenCalledWith(
        'order_uuid',
        'pay_uuid',
        PaymentStatus.REFUNDED,
        OrderStatus.REFUNDED,
      );
    },
  );

  it('should ignore unknown events but still record them', async () => {
    mockPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
    mockPrisma.payment.findFirst.mockResolvedValue(payment);

    const result = await service.handleWebhook({
      event: 'PAYMENT_ANTICIPATED',
      payment,
    });

    expect(result).toEqual({ received: true, processed: true });
    expect(paymentServiceMock.markOrderPaid).not.toHaveBeenCalled();
    expect(paymentServiceMock.releaseOrder).not.toHaveBeenCalled();
    expect(mockPrisma.paymentWebhookEvent.create).toHaveBeenCalled();
  });

  it('should not record the event when a transition throws (allows retry)', async () => {
    mockPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
    mockPrisma.payment.findFirst.mockResolvedValue(payment);
    paymentServiceMock.markOrderPaid.mockRejectedValue(new Error('DB down'));

    await expect(
      service.handleWebhook({ event: 'PAYMENT_RECEIVED', payment }),
    ).rejects.toThrow('DB down');

    expect(mockPrisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
  });
});
