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

const mockAdminService = {
  listOrganizerApplications: jest.fn(),
  approveOrganizerApplication: jest.fn(),
  rejectOrganizerApplication: jest.fn(),
  listOrders: jest.fn(),
  getOrderDetail: jest.fn(),
  confirmPayment: jest.fn(),
  rejectPayment: jest.fn(),
};

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: typeof mockAdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockAdminService }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    adminService = module.get(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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
