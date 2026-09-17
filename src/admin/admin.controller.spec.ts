jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
  Role: {
    BUYER: 'BUYER',
    ORGANIZER: 'ORGANIZER',
    ADMIN: 'ADMIN',
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { EventService } from 'src/event/event.service';
import { VenueService } from 'src/venue/venue.service';
import { UserService } from 'src/user/user.service';

const mockAdminService = {
  listOrganizerApplications: jest.fn(),
  approveOrganizerApplication: jest.fn(),
  rejectOrganizerApplication: jest.fn(),
  listOrders: jest.fn(),
  getOrderDetail: jest.fn(),
  confirmPayment: jest.fn(),
  rejectPayment: jest.fn(),
};

const mockEventService = {
  findManaged: jest.fn(),
};

const mockVenueService = {
  findManaged: jest.fn(),
};

const mockUserService = {
  findById: jest.fn(),
};

const adminUser = { id: 'admin-uuid', role: 'ADMIN' as const };

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: typeof mockAdminService;
  let eventService: typeof mockEventService;
  let venueService: typeof mockVenueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
        { provide: EventService, useValue: mockEventService },
        { provide: VenueService, useValue: mockVenueService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    adminService = module.get(AdminService);
    eventService = module.get(EventService);
    venueService = module.get(VenueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('event & venue management', () => {
    it('should list managed events', async () => {
      const query = { page: 1, limit: 15, status: 'DRAFT' as const };
      const expected = { data: [], meta: {} };

      eventService.findManaged.mockResolvedValue(expected);

      const result = await controller.listEvents(query, adminUser);

      expect(eventService.findManaged).toHaveBeenCalledWith(query, adminUser);
      expect(result).toEqual(expected);
    });

    it('should list managed venues', async () => {
      const query = { page: 1, limit: 15 };
      const expected = { data: [], meta: {} };

      venueService.findManaged.mockResolvedValue(expected);

      const result = await controller.listVenues(query, adminUser);

      expect(venueService.findManaged).toHaveBeenCalledWith(query, adminUser);
      expect(result).toEqual(expected);
    });
  });

  describe('organizer applications', () => {
    it('should list organizer applications with query', async () => {
      const query = { status: 'PENDING' as const };
      const expected = { data: [], meta: {} };

      adminService.listOrganizerApplications.mockResolvedValue(expected);

      const result = await controller.listOrganizerSummary(query);

      expect(adminService.listOrganizerApplications).toHaveBeenCalledWith(
        query,
      );
      expect(result).toEqual(expected);
    });

    it('should approve an organizer application', async () => {
      const expected = { id: 'profile-1' };

      adminService.approveOrganizerApplication.mockResolvedValue(expected);

      const result = await controller.approveOrganizerApplication('app-1');

      expect(adminService.approveOrganizerApplication).toHaveBeenCalledWith(
        'app-1',
      );
      expect(result).toEqual(expected);
    });

    it('should reject an organizer application with reason', async () => {
      const dto = { rejectReason: 'Invalid document' };
      const expected = { id: 'app-1', status: 'REJECTED' };

      adminService.rejectOrganizerApplication.mockResolvedValue(expected);

      const result = await controller.rejectOrganizerApplication('app-1', dto);

      expect(adminService.rejectOrganizerApplication).toHaveBeenCalledWith(
        'app-1',
        dto,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('payment management', () => {
    it('should list orders with query', async () => {
      const query = { status: 'PENDING' as const };
      const expected = { data: [], meta: {} };

      adminService.listOrders.mockResolvedValue(expected);

      const result = await controller.listOrders(query);

      expect(adminService.listOrders).toHaveBeenCalledWith(query);
      expect(result).toEqual(expected);
    });

    it('should find order detail', async () => {
      const expected = { id: 'ord-1', orderItems: [], payment: {} };

      adminService.getOrderDetail.mockResolvedValue(expected);

      const result = await controller.findOrder('ord-1');

      expect(adminService.getOrderDetail).toHaveBeenCalledWith('ord-1');
      expect(result).toEqual(expected);
    });

    it('should confirm payment', async () => {
      adminService.confirmPayment.mockResolvedValue(undefined);

      await controller.confirmPayment('ord-1');

      expect(adminService.confirmPayment).toHaveBeenCalledWith('ord-1');
    });

    it('should reject payment with reason', async () => {
      const dto = { reason: 'Insufficient proof' };
      adminService.rejectPayment.mockResolvedValue(undefined);

      await controller.rejectPayment('ord-1', dto);

      expect(adminService.rejectPayment).toHaveBeenCalledWith(
        'ord-1',
        'Insufficient proof',
      );
    });

    it('should reject payment without reason', async () => {
      adminService.rejectPayment.mockResolvedValue(undefined);

      await controller.rejectPayment('ord-1', {});

      expect(adminService.rejectPayment).toHaveBeenCalledWith(
        'ord-1',
        undefined,
      );
    });
  });
});
