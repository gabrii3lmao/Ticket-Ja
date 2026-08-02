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
    update: jest.fn(),
  },
};

const userId = 'user-uuid';

const baseEvent = {
  id: 'event-uuid',
  name: 'Rock in Rio',
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
  });

  describe('findOne', () => {
    it('should return a ticket owned by the user', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({ ...baseTicket });

      const result = await service.findOne('ticket-uuid', userId);

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

      await expect(service.findOne('nonexistent', userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when ticket belongs to another user', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...baseTicket,
        userId: 'other-user',
      });

      await expect(service.findOne('ticket-uuid', userId)).rejects.toThrow(
        ForbiddenException,
      );
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

    it('should throw NotFoundException when code is invalid', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.validate('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAsUsed', () => {
    it('should mark a VALID ticket as USED', async () => {
      const usedTicket = { ...baseTicket, status: 'USED' };
      mockPrisma.ticket.findUnique.mockResolvedValue({ ...baseTicket });
      mockPrisma.ticket.update.mockResolvedValue(usedTicket);

      const result = await service.markAsUsed('ticket-uuid', userId);

      expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-uuid' },
        data: { status: 'USED' },
      });
      expect(result).toEqual(usedTicket);
    });

    it('should throw NotFoundException when ticket does not exist', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.markAsUsed('nonexistent', userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when ticket belongs to another user', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...baseTicket,
        userId: 'other-user',
      });

      await expect(service.markAsUsed('ticket-uuid', userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when ticket is already USED', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...baseTicket,
        status: 'USED',
      });

      await expect(service.markAsUsed('ticket-uuid', userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when ticket is CANCELED', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...baseTicket,
        status: 'CANCELED',
      });

      await expect(service.markAsUsed('ticket-uuid', userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
