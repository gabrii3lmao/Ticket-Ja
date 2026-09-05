jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
  Role: {
    BUYER: 'BUYER',
    ORGANIZER: 'ORGANIZER',
    ADMIN: 'ADMIN',
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';

const mockCouponService = {
  create: jest.fn(),
  getAll: jest.fn(),
  getOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('CouponController', () => {
  let controller: CouponController;
  let couponService: typeof mockCouponService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CouponController],
      providers: [{ provide: CouponService, useValue: mockCouponService }],
    }).compile();

    controller = module.get<CouponController>(CouponController);
    couponService = module.get(CouponService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate coupon creation to the service', async () => {
      const dto = { code: 'VIP10' };
      const user = { id: 'user-uuid', role: 'ORGANIZER' };
      const expected = { id: 'coupon-uuid', ...dto };

      couponService.create.mockResolvedValue(expected);

      const result = await controller.create(
        dto as never,
        'event-uuid',
        user as never,
      );

      expect(couponService.create).toHaveBeenCalledWith(
        'event-uuid',
        user,
        dto,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('list', () => {
    it('should delegate list to the service', async () => {
      const query = { page: 1, limit: 10 };
      const user = { id: 'user-uuid', role: 'ORGANIZER' };
      const expected = { data: [], meta: {} };

      couponService.getAll.mockResolvedValue(expected);

      const result = await controller.listAll(
        query,
        user as never,
        'event-uuid',
      );

      expect(couponService.getAll).toHaveBeenCalledWith(
        user,
        'event-uuid',
        query,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('getOne', () => {
    it('should delegate getOne to the service', async () => {
      const user = { id: 'user-uuid', role: 'ORGANIZER' };
      const expected = { id: 'coupon-uuid' };

      couponService.getOne.mockResolvedValue(expected);

      const result = await controller.getOne(
        user as never,
        'event-uuid',
        'coupon-uuid',
      );

      expect(couponService.getOne).toHaveBeenCalledWith(
        user,
        'event-uuid',
        'coupon-uuid',
      );
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should delegate update to the service', async () => {
      const dto = { active: false };
      const user = { id: 'user-uuid', role: 'ORGANIZER' };
      const expected = { id: 'coupon-uuid', active: false };

      couponService.update.mockResolvedValue(expected);

      const result = await controller.update(
        dto,
        'event-uuid',
        'coupon-uuid',
        user as never,
      );

      expect(couponService.update).toHaveBeenCalledWith(
        'coupon-uuid',
        'event-uuid',
        user,
        dto,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('delete', () => {
    it('should delegate delete to the service', async () => {
      const user = { id: 'user-uuid', role: 'ORGANIZER' };

      couponService.delete.mockResolvedValue({ id: 'coupon-uuid' });

      const result = await controller.delete(
        'coupon-uuid',
        user as never,
        'event-uuid',
      );

      expect(couponService.delete).toHaveBeenCalledWith(
        'coupon-uuid',
        'event-uuid',
        user,
      );
      expect(result).toEqual({ id: 'coupon-uuid' });
    });
  });
});
