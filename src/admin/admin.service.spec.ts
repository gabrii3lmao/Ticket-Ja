jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
  Role: {
    BUYER: 'BUYER',
    ORGANIZER: 'ORGANIZER',
    ADMIN: 'ADMIN',
  },
  PaymentStatus: { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED' },
  OrderStatus: { PENDING: 'PENDING', PAID: 'PAID', CANCELED: 'CANCELED' },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from 'src/prisma.service';
import { PaymentService } from 'src/payment/payment.service';

const mockPrisma = {
  $transaction: jest.fn(),
  organizerAplication: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  organizerProfile: {
    create: jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
  },
  payment: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockPaymentService = {
  markOrderPaid: jest.fn(),
  releaseOrder: jest.fn(),
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaymentService, useValue: mockPaymentService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    mockPrisma.$transaction.mockImplementation(
      (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listOrganizerApplications', () => {
    it('should return paginated applications with metadata', async () => {
      const apps = [{ id: 'app-1' }];
      const query = { page: 2, limit: 5 };

      mockPrisma.organizerAplication.findMany.mockResolvedValue(apps);
      mockPrisma.organizerAplication.count.mockResolvedValue(12);

      const result = await service.listOrganizerApplications(query);

      expect(mockPrisma.organizerAplication.findMany).toHaveBeenCalledWith({
        where: {
          status: undefined,
          document: undefined,
          legalName: undefined,
          tradeName: undefined,
        },
        skip: 5,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, name: true, createdAt: true },
          },
        },
      });
      expect(mockPrisma.organizerAplication.count).toHaveBeenCalledWith({
        where: {
          status: undefined,
          document: undefined,
          legalName: undefined,
          tradeName: undefined,
        },
      });
      expect(result).toEqual({
        data: apps,
        meta: { total: 12, page: 2, limit: 5, totalPages: 3 },
      });
    });

    it('should apply filters and custom sort', async () => {
      const query = {
        status: 'PENDING' as const,
        legalName: 'john',
        sortBy: 'legalName',
        sortOrder: 'asc' as const,
      };

      mockPrisma.organizerAplication.findMany.mockResolvedValue([]);
      mockPrisma.organizerAplication.count.mockResolvedValue(0);

      await service.listOrganizerApplications(query);

      expect(mockPrisma.organizerAplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            status: 'PENDING',
            legalName: { contains: 'john', mode: 'insensitive' },
          }),
          orderBy: { legalName: 'asc' },
        }),
      );
    });
  });

  describe('approveOrganizerApplication', () => {
    it('should create organizer profile, update role and delete application', async () => {
      const application = {
        id: 'app-1',
        legalName: 'John Corp LTDA',
        tradeName: 'John Corp',
        document: '12345678000190',
        userId: 'user-1',
        status: 'PENDING',
      };
      const createdProfile = { id: 'profile-1', userId: 'user-1' };

      mockPrisma.organizerAplication.findUnique.mockResolvedValue(application);
      mockPrisma.organizerProfile.create.mockResolvedValue(createdProfile);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.organizerAplication.delete.mockResolvedValue(application);

      const result = await service.approveOrganizerApplication('app-1');

      expect(mockPrisma.organizerProfile.create).toHaveBeenCalledWith({
        data: {
          legalName: application.legalName,
          tradeName: application.tradeName,
          document: application.document,
          userId: application.userId,
        },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { role: 'ORGANIZER' },
      });
      expect(mockPrisma.organizerAplication.delete).toHaveBeenCalledWith({
        where: { id: 'app-1' },
      });
      expect(result).toEqual(createdProfile);
    });

    it('should throw NotFoundException when application does not exist', async () => {
      mockPrisma.organizerAplication.findUnique.mockResolvedValue(null);

      await expect(
        service.approveOrganizerApplication('missing'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when application is not PENDING', async () => {
      mockPrisma.organizerAplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: 'REJECTED',
      });

      await expect(
        service.approveOrganizerApplication('app-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.organizerProfile.create).not.toHaveBeenCalled();
    });
  });

  describe('rejectOrganizerApplication', () => {
    it('should mark application as REJECTED with reason', async () => {
      const application = {
        id: 'app-1',
        status: 'PENDING',
      };
      const updated = { id: 'app-1', status: 'REJECTED' };
      const dto = { rejectReason: 'Invalid document' };

      mockPrisma.organizerAplication.findUnique.mockResolvedValue(application);
      mockPrisma.organizerAplication.update.mockResolvedValue(updated);

      const result = await service.rejectOrganizerApplication('app-1', dto);

      expect(mockPrisma.organizerAplication.update).toHaveBeenCalledWith({
        where: { id: 'app-1' },
        data: { status: 'REJECTED', rejectedReason: 'Invalid document' },
      });
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when application does not exist', async () => {
      mockPrisma.organizerAplication.findUnique.mockResolvedValue(null);

      await expect(
        service.rejectOrganizerApplication('missing', { rejectReason: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when application is not PENDING', async () => {
      mockPrisma.organizerAplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: 'APPROVED',
      });

      await expect(
        service.rejectOrganizerApplication('app-1', {}),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.organizerAplication.update).not.toHaveBeenCalled();
    });
  });

  describe('listOrders', () => {
    it('should return paginated orders with default PENDING status', async () => {
      const orders = [{ id: 'ord-1', status: 'PENDING' }];
      mockPrisma.order.findMany.mockResolvedValue(orders);
      mockPrisma.order.count.mockResolvedValue(1);

      const result = await service.listOrders({});

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual({
        data: orders,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });
    });

    it('should apply custom status filter', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      await service.listOrders({ status: 'PAID' });

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PAID' },
        }),
      );
    });
  });

  describe('getOrderDetail', () => {
    it('should return order with items, payment and user', async () => {
      const order = {
        id: 'ord-1',
        orderItems: [],
        payment: { id: 'pay-1' },
        user: { id: 'user-1', name: 'John' },
      };
      mockPrisma.order.findUnique.mockResolvedValue(order);

      const result = await service.getOrderDetail('ord-1');

      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'ord-1' },
        include: {
          orderItems: true,
          payment: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              taxId: true,
              phone: true,
            },
          },
        },
      });
      expect(result).toEqual(order);
    });

    it('should return null when order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      const result = await service.getOrderDetail('missing');

      expect(result).toBeNull();
    });
  });

  describe('confirmPayment', () => {
    it('should call paymentService.markOrderPaid with correct params', async () => {
      const payment = { id: 'pay-1', orderId: 'ord-1' };
      mockPrisma.payment.findUnique.mockResolvedValue(payment);
      mockPaymentService.markOrderPaid.mockResolvedValue(undefined);

      await service.confirmPayment('ord-1');

      expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith({
        where: { orderId: 'ord-1' },
      });
      expect(mockPaymentService.markOrderPaid).toHaveBeenCalledWith(
        'ord-1',
        'pay-1',
      );
    });

    it('should throw NotFoundException when payment does not exist', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.confirmPayment('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPaymentService.markOrderPaid).not.toHaveBeenCalled();
    });
  });

  describe('rejectPayment', () => {
    it('should update payment and call paymentService.releaseOrder', async () => {
      const payment = { id: 'pay-1', orderId: 'ord-1' };
      mockPrisma.payment.findUnique.mockResolvedValue(payment);
      mockPrisma.payment.update.mockResolvedValue({
        ...payment,
        rejectReason: 'Insufficient proof',
        rejectedAt: new Date(),
      });
      mockPaymentService.releaseOrder.mockResolvedValue(undefined);

      await service.rejectPayment('ord-1', 'Insufficient proof');

      expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith({
        where: { orderId: 'ord-1' },
      });
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { orderId: 'ord-1' },
        data: {
          rejectReason: 'Insufficient proof',
          rejectedAt: expect.any(Date),
        },
      });
      expect(mockPaymentService.releaseOrder).toHaveBeenCalledWith(
        'ord-1',
        'pay-1',
        'REJECTED',
        'CANCELED',
      );
    });

    it('should work without reason', async () => {
      const payment = { id: 'pay-1', orderId: 'ord-1' };
      mockPrisma.payment.findUnique.mockResolvedValue(payment);
      mockPrisma.payment.update.mockResolvedValue(payment);
      mockPaymentService.releaseOrder.mockResolvedValue(undefined);

      await service.rejectPayment('ord-1');

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { orderId: 'ord-1' },
        data: {
          rejectReason: undefined,
          rejectedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException when payment does not exist', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.rejectPayment('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPaymentService.releaseOrder).not.toHaveBeenCalled();
    });
  });
});
