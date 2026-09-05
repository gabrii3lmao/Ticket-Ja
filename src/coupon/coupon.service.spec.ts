jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DiscountType, Role } from 'generated/prisma/enums';
import { CouponService } from './coupon.service';
import { PrismaService } from 'src/prisma.service';

const mockPrisma = {
  $transaction: jest.fn(),
  coupon: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  event: {
    findUnique: jest.fn(),
  },
};

const eventId = 'event-uuid';
const couponId = 'coupon-uuid';
const ownerId = 'owner-uuid';
const organizerUser = { id: ownerId, role: Role.ORGANIZER };
const adminUser = { id: 'admin-uuid', role: Role.ADMIN };
const otherOrganizerUser = { id: 'other-owner', role: Role.ORGANIZER };
const buyerUser = { id: 'buyer-uuid', role: Role.BUYER };

const ownedEvent = {
  id: eventId,
  name: 'Rock in Rio',
  organizerProfile: { userId: ownerId },
};

const baseCoupon = {
  id: couponId,
  code: 'VIP10',
  description: '10% off VIP',
  discountType: DiscountType.PERCENTAGE,
  value: 10,
  expiresAt: null,
  maxUses: null,
  currentUses: 0,
  active: true,
  eventId,
};

describe('CouponService', () => {
  let service: CouponService;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CouponService>(CouponService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a coupon uppercasing the code and scoping it to the event', async () => {
      prisma.event.findUnique.mockResolvedValue(ownedEvent);
      prisma.coupon.create.mockResolvedValue(baseCoupon);

      const dto = {
        code: '  vip10 ',
        description: '10% off VIP',
        discountType: DiscountType.PERCENTAGE,
        value: 10,
      };

      await service.create(eventId, organizerUser, dto);

      expect(prisma.coupon.create).toHaveBeenCalledWith({
        data: { ...dto, code: 'VIP10', eventId },
      });
    });

    it('should throw NotFoundException when the event does not exist', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      const dto = {
        code: 'VIP10',
        description: 'desc',
        discountType: DiscountType.PERCENTAGE,
        value: 10,
      };

      await expect(
        service.create(eventId, organizerUser, dto as never),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.coupon.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the user does not own the event', async () => {
      prisma.event.findUnique.mockResolvedValue(ownedEvent);

      const dto = {
        code: 'VIP10',
        description: 'desc',
        discountType: DiscountType.PERCENTAGE,
        value: 10,
      };

      await expect(
        service.create(eventId, otherOrganizerUser, dto as never),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.coupon.create).not.toHaveBeenCalled();
    });

    it('should allow admins to create coupons for any event', async () => {
      prisma.event.findUnique.mockResolvedValue(ownedEvent);
      prisma.coupon.create.mockResolvedValue(baseCoupon);

      const dto = {
        code: 'VIP10',
        description: 'desc',
        discountType: DiscountType.PERCENTAGE,
        value: 10,
      };

      await expect(
        service.create(eventId, adminUser, dto as never),
      ).resolves.toEqual(baseCoupon);
    });

    it('should throw BadRequestException for PERCENTAGE value above 100', async () => {
      prisma.event.findUnique.mockResolvedValue(ownedEvent);

      const dto = {
        code: 'VIP10',
        description: 'desc',
        discountType: DiscountType.PERCENTAGE,
        value: 150,
      };

      await expect(
        service.create(eventId, organizerUser, dto as never),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.coupon.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for value less than or equal to zero', async () => {
      prisma.event.findUnique.mockResolvedValue(ownedEvent);

      const dto = {
        code: 'VIP10',
        description: 'desc',
        discountType: DiscountType.FIXED,
        value: 0,
      };

      await expect(
        service.create(eventId, organizerUser, dto as never),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.coupon.create).not.toHaveBeenCalled();
    });
  });

  describe('getAll', () => {
    it('should return paginated coupons scoped to the owned event', async () => {
      prisma.event.findUnique.mockResolvedValue(ownedEvent);
      prisma.$transaction.mockResolvedValue([[baseCoupon], 1]);

      const result = await service.getAll(organizerUser, eventId, {});

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({
        data: [baseCoupon],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });
    });

    it('should throw ForbiddenException when the user does not own the event', async () => {
      prisma.event.findUnique.mockResolvedValue(ownedEvent);

      await expect(
        service.getAll(otherOrganizerUser, eventId, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getOne', () => {
    it('should return the coupon when it belongs to the owned event', async () => {
      prisma.event.findUnique.mockResolvedValue(ownedEvent);
      prisma.coupon.findUnique.mockResolvedValue(baseCoupon);

      const result = await service.getOne(organizerUser, eventId, couponId);

      expect(prisma.coupon.findUnique).toHaveBeenCalledWith({
        where: { id: couponId, eventId },
      });
      expect(result).toEqual(baseCoupon);
    });

    it('should throw NotFoundException when the coupon does not exist', async () => {
      prisma.event.findUnique.mockResolvedValue(ownedEvent);
      prisma.coupon.findUnique.mockResolvedValue(null);

      await expect(
        service.getOne(organizerUser, eventId, couponId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a coupon owned by the user', async () => {
      prisma.event.findUnique.mockResolvedValue(ownedEvent);
      prisma.coupon.findUnique.mockResolvedValue(baseCoupon);
      prisma.coupon.update.mockResolvedValue({
        ...baseCoupon,
        active: false,
      });

      await service.update(couponId, eventId, organizerUser, {
        active: false,
      });

      expect(prisma.coupon.update).toHaveBeenCalledWith({
        where: { id: couponId },
        data: { active: false },
      });
    });

    it('should uppercase the code when code is provided', async () => {
      prisma.event.findUnique.mockResolvedValue(ownedEvent);
      prisma.coupon.findUnique.mockResolvedValue(baseCoupon);
      prisma.coupon.update.mockResolvedValue(baseCoupon);

      await service.update(couponId, eventId, organizerUser, {
        code: 'vip20',
      });

      expect(prisma.coupon.update).toHaveBeenCalledWith({
        where: { id: couponId },
        data: { code: 'VIP20' },
      });
    });

    it('should throw NotFoundException when the coupon does not exist in the event', async () => {
      prisma.event.findUnique.mockResolvedValue(ownedEvent);
      prisma.coupon.findUnique.mockResolvedValue(null);

      await expect(
        service.update(couponId, eventId, organizerUser, {}),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.coupon.update).not.toHaveBeenCalled();
    });

    it('should validate value when both discountType and value are provided', async () => {
      prisma.event.findUnique.mockResolvedValue(ownedEvent);
      prisma.coupon.findUnique.mockResolvedValue(baseCoupon);

      await expect(
        service.update(couponId, eventId, organizerUser, {
          discountType: DiscountType.PERCENTAGE,
          value: 200,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.coupon.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a coupon owned by the event', async () => {
      prisma.event.findUnique.mockResolvedValue(ownedEvent);
      prisma.coupon.findUnique.mockResolvedValue(baseCoupon);
      prisma.coupon.delete.mockResolvedValue(baseCoupon);

      await service.delete(couponId, eventId, organizerUser);

      expect(prisma.coupon.delete).toHaveBeenCalledWith({
        where: { id: couponId },
      });
    });

    it('should throw NotFoundException when the coupon does not exist', async () => {
      prisma.event.findUnique.mockResolvedValue(ownedEvent);
      prisma.coupon.findUnique.mockResolvedValue(null);

      await expect(
        service.delete(couponId, eventId, organizerUser),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.coupon.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException for a buyer user', async () => {
      prisma.event.findUnique.mockResolvedValue(ownedEvent);

      await expect(
        service.delete(couponId, eventId, buyerUser),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.coupon.delete).not.toHaveBeenCalled();
    });
  });
});
