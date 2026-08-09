jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TicketService } from './ticket.service';
import { PrismaService } from 'src/prisma.service';

const mockPrisma = {
  $transaction: jest.fn(),
  ticket: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  },
};

const userId = 'user-uuid';
const user = { id: userId, role: 'BUYER' as const };
const adminUser = { id: 'admin-uuid', role: 'ADMIN' as const };

const baseEvent = {
  id: 'event-uuid',
  name: 'Rock in Rio',
  status: 'PUBLISHED',
  startDate: new Date('2099-09-15'),
  venue: {
    id: 'venue-uuid',
    name: 'Parque Olímpico',
    city: 'Rio de Janeiro',
    state: 'RJ',
  },
};

const baseTicket = {
  id: 'ticket-uuid',
  code: 'TKT-ABC123',
  qrCode: 'http://localhost:3000/api/ticket/validate/TKT-ABC123',
  status: 'VALID',
  createdAt: new Date('2026-08-01'),
  userId,
  eventId: 'event-uuid',
  event: baseEvent,
  orderItem: {
    id: 'oi-uuid',
    orderId: 'order-uuid',
    categoryId: 'cat-uuid',
    order: {
      id: 'order-uuid',
      userId,
      status: 'PAID',
      subtotal: 500,
      discount: 0,
      fee: 25,
      total: 525,
    },
    category: {
      id: 'cat-uuid',
      name: 'Pista Premium',
      price: 250,
    },
  },
};

describe('TicketService', () => {
  let service: TicketService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TicketService>(TicketService);

    mockPrisma.$transaction.mockImplementation((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated tickets for the user', async () => {
      const tickets = [{ ...baseTicket }];
      mockPrisma.ticket.findMany.mockResolvedValue(tickets);
      mockPrisma.ticket.count.mockResolvedValue(1);

      const result = await service.findAll({}, userId);

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({ userId }),
        }),
      );
      expect(result).toEqual({
        data: tickets,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });
    });

    it('should apply status filter when provided', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.ticket.count.mockResolvedValue(0);

      await service.findAll({ status: 'USED' }, userId);

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({ status: 'USED', userId }),
        }),
      );
    });

    it('should apply orderId filter via orderItem', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.ticket.count.mockResolvedValue(0);

      await service.findAll({ orderId: 'order-uuid' }, userId);

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            orderItem: { orderId: 'order-uuid' },
          }),
        }),
      );
    });

    it('should apply code filter when provided', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.ticket.count.mockResolvedValue(0);

      await service.findAll({ code: 'TKT-ABC' }, userId);

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({ code: 'TKT-ABC' }),
        }),
      );
    });

    it('should paginate results correctly', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.ticket.count.mockResolvedValue(25);

      const result = await service.findAll({ page: 3, limit: 10 }, userId);

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
      expect(result.meta).toEqual({
        total: 25,
        page: 3,
        limit: 10,
        totalPages: 3,
      });
    });

    it('should apply eventId filter', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.ticket.count.mockResolvedValue(0);

      await service.findAll({ eventId: 'event-uuid' }, userId);

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventId: 'event-uuid',
            userId,
          }),
        }),
      );
    });

    it('should apply custom sort', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.ticket.count.mockResolvedValue(0);

      await service.findAll({ sortBy: 'createdAt', sortOrder: 'asc' }, userId);

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('should return totalPages 1 when page exceeds available data', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.ticket.count.mockResolvedValue(5);

      const result = await service.findAll({ page: 3, limit: 10 }, userId);

      expect(result.meta).toEqual({
        total: 5,
        page: 3,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('findOne', () => {
    it('should return a ticket owned by the user', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({ ...baseTicket });

      const result = await service.findOne('ticket-uuid', user);

      expect(mockPrisma.ticket.findUnique).toHaveBeenCalledWith({
        where: { id: 'ticket-uuid' },
        include: {
          orderItem: { include: { order: true, category: true } },
          event: true,
        },
      });
      expect(result).toEqual(baseTicket);
    });

    it('should throw NotFoundException when ticket does not exist', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when ticket belongs to another user', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...baseTicket,
        userId: 'other-user',
      });

      await expect(service.findOne('ticket-uuid', user)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow ADMIN to view a ticket of another user', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...baseTicket,
        userId: 'other-user',
      });

      const result = await service.findOne('ticket-uuid', adminUser);

      expect(mockPrisma.ticket.findUnique).toHaveBeenCalledWith({
        where: { id: 'ticket-uuid' },
        include: {
          orderItem: { include: { order: true, category: true } },
          event: true,
        },
      });
      expect(result.userId).toBe('other-user');
    });
  });

  describe('validate', () => {
    it('should return valid ticket info for a VALID ticket', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({ ...baseTicket });

      const result = await service.validate('TKT-ABC123');

      expect(mockPrisma.ticket.findUnique).toHaveBeenCalledWith({
        where: { code: 'TKT-ABC123' },
        include: { event: { include: { venue: true } } },
      });
      expect(result).toEqual({
        ticket: {
          code: 'TKT-ABC123',
          status: 'VALID',
          createdAt: baseTicket.createdAt,
        },
        event: {
          name: 'Rock in Rio',
          startDate: baseEvent.startDate,
          venue: {
            name: 'Parque Olímpico',
            city: 'Rio de Janeiro',
            state: 'RJ',
          },
        },
        valid: true,
      });
    });

    it('should return valid: false for a USED ticket', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...baseTicket,
        status: 'USED',
      });

      const result = await service.validate('TKT-ABC123');

      expect(result.valid).toBe(false);
    });

    it('should return valid: false for a CANCELED ticket', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...baseTicket,
        status: 'CANCELED',
      });

      const result = await service.validate('TKT-ABC123');

      expect(result.valid).toBe(false);
    });

    it('should return valid: false when event is FINISHED', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...baseTicket,
        event: { ...baseEvent, status: 'FINISHED' },
      });

      const result = await service.validate('TKT-ABC123');

      expect(result.valid).toBe(false);
    });

    it('should return valid: false when event is CANCELED', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...baseTicket,
        event: { ...baseEvent, status: 'CANCELED' },
      });

      const result = await service.validate('TKT-ABC123');

      expect(result.valid).toBe(false);
    });

    it('should throw NotFoundException when code is invalid', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.validate('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAsUsed', () => {
    it('should mark a VALID ticket as USED', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({ ...baseTicket });
      mockPrisma.ticket.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.markAsUsed('ticket-uuid', user);

      expect(mockPrisma.ticket.updateMany).toHaveBeenCalledWith({
        where: { id: 'ticket-uuid', status: 'VALID' },
        data: { status: 'USED', usedAt: expect.any(Date) },
      });
      expect(result).toEqual({ count: 1 });
    });

    it('should throw BadRequestException when updateMany count is 0', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({ ...baseTicket });
      mockPrisma.ticket.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.markAsUsed('ticket-uuid', user)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when ticket does not exist', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.markAsUsed('nonexistent', user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when ticket belongs to another user', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...baseTicket,
        userId: 'other-user',
      });

      await expect(service.markAsUsed('ticket-uuid', user)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow ADMIN to mark a ticket of another user as used', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...baseTicket,
        userId: 'other-user',
      });
      mockPrisma.ticket.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.markAsUsed('ticket-uuid', adminUser);

      expect(mockPrisma.ticket.updateMany).toHaveBeenCalledWith({
        where: { id: 'ticket-uuid', status: 'VALID' },
        data: { status: 'USED', usedAt: expect.any(Date) },
      });
      expect(result).toEqual({ count: 1 });
    });

    it('should throw BadRequestException when ticket is already USED', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...baseTicket,
        status: 'USED',
      });

      await expect(service.markAsUsed('ticket-uuid', user)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when ticket is CANCELED', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...baseTicket,
        status: 'CANCELED',
      });

      await expect(service.markAsUsed('ticket-uuid', user)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
