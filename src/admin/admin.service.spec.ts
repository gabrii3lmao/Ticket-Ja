jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
  Role: {
    BUYER: 'BUYER',
    ORGANIZER: 'ORGANIZER',
    ADMIN: 'ADMIN',
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from 'src/prisma.service';

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
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
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
        meta: { total: 12, page: 2, limit: 5, totalPage: 3 },
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
});
