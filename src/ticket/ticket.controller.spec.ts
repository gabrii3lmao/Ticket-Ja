jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { UserService } from 'src/user/user.service';

const mockTicketService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  validate: jest.fn(),
  markAsUsed: jest.fn(),
};

const mockUserService = {
  findById: jest.fn(),
};

const userId = 'user-uuid';
const user = { id: userId, role: 'BUYER' as const };

describe('TicketController', () => {
  let controller: TicketController;
  let ticketService: typeof mockTicketService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketController],
      providers: [
        { provide: TicketService, useValue: mockTicketService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    controller = module.get<TicketController>(TicketController);
    ticketService = module.get(TicketService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should call ticketService.findAll with query and userId', async () => {
      const query = { page: 1, limit: 10 };
      const result = {
        data: [{ id: 'ticket-1', code: 'TKT-ABC', status: 'VALID' }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      mockTicketService.findAll.mockResolvedValue(result);

      const response = await controller.findAll(query, user);

      expect(ticketService.findAll).toHaveBeenCalledWith(query, userId);
      expect(response).toEqual(result);
    });
  });

  describe('findOne', () => {
    it('should call ticketService.findOne with id and user', async () => {
      const ticket = { id: 'ticket-1', code: 'TKT-ABC', status: 'VALID' };
      mockTicketService.findOne.mockResolvedValue(ticket);

      const result = await controller.findOne('ticket-1', user);

      expect(ticketService.findOne).toHaveBeenCalledWith('ticket-1', user);
      expect(result).toEqual(ticket);
    });
  });

  describe('validate', () => {
    it('should call ticketService.validate with code', async () => {
      const result = {
        ticket: { code: 'TKT-ABC', status: 'VALID', createdAt: new Date() },
        event: { name: 'Rock in Rio', startDate: new Date(), venue: {} },
        valid: true,
      };
      mockTicketService.validate.mockResolvedValue(result);

      const response = await controller.validate('TKT-ABC');

      expect(ticketService.validate).toHaveBeenCalledWith('TKT-ABC');
      expect(response).toEqual(result);
    });
  });

  describe('markAsUsed', () => {
    it('should call ticketService.markAsUsed with id and user', async () => {
      const ticket = { id: 'ticket-1', status: 'USED' };
      mockTicketService.markAsUsed.mockResolvedValue(ticket);

      const result = await controller.markAsUsed('ticket-1', user);

      expect(ticketService.markAsUsed).toHaveBeenCalledWith('ticket-1', user);
      expect(result).toEqual(ticket);
    });
  });
});
