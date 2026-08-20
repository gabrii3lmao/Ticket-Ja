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

  it('should list organizer applications with query', async () => {
    const query = { status: 'PENDING' as const };
    const expected = { data: [], meta: {} };

    adminService.listOrganizerApplications.mockResolvedValue(expected);

    const result = await controller.listOrganizerSummary(query);

    expect(adminService.listOrganizerApplications).toHaveBeenCalledWith(query);
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
