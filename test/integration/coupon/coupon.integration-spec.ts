import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CouponModule } from 'src/coupon/coupon.module';
import { CouponService } from 'src/coupon/coupon.service';
import { PrismaService } from 'src/prisma.service';
import { resetDatabase } from '../setup/database';
import {
  createBuyer,
  createCoupon,
  createEvent,
  createOrganizer,
  createVenue,
  randomDocument,
} from '../support/factories';
import { createIntegrationModule } from '../support/test-module';

describe('CouponService (integration)', () => {
  let service: CouponService;
  let prisma: PrismaService;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const context = await createIntegrationModule([CouponModule]);
    service = context.moduleRef.get(CouponService);
    prisma = context.prisma;
    close = context.close;
  });

  afterAll(async () => {
    await close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  async function createEventContext() {
    const { user, profile } = await createOrganizer(prisma);
    const venue = await createVenue(prisma, profile.id);
    const event = await createEvent(prisma, profile.id, venue.id, {
      status: 'PUBLISHED',
    });
    return { user, profile, venue, event };
  }

  function owner(userId: string) {
    return { id: userId, role: 'ORGANIZER' as const };
  }

  function createDto(code: string, overrides: Record<string, unknown> = {}) {
    return {
      code,
      description: 'Test coupon',
      discountType: 'FIXED' as const,
      value: 10,
      ...overrides,
    };
  }

  describe('create', () => {
    it('creates a coupon with an uppercased and trimmed code', async () => {
      const { user, event } = await createEventContext();

      const coupon = await service.create(
        event.id,
        owner(user.id),
        createDto('  vip10  '),
      );

      expect(coupon).toMatchObject({
        code: 'VIP10',
        eventId: event.id,
        discountType: 'FIXED',
        active: true,
      });
      await expect(
        prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } }),
      ).resolves.toMatchObject({ code: 'VIP10' });
    });

    it.each([
      ['zero', 0],
      ['negative', -1],
    ])('rejects a %s value', async (_label, value) => {
      const { user, event } = await createEventContext();

      await expect(
        service.create(
          event.id,
          owner(user.id),
          createDto('INVALID', { value }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a percentage above 100', async () => {
      const { user, event } = await createEventContext();

      await expect(
        service.create(
          event.id,
          owner(user.id),
          createDto('OVER', { discountType: 'PERCENTAGE', value: 100.01 }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows a percentage of exactly 100', async () => {
      const { user, event } = await createEventContext();

      await expect(
        service.create(
          event.id,
          owner(user.id),
          createDto('FREE', { discountType: 'PERCENTAGE', value: 100 }),
        ),
      ).resolves.toMatchObject({ code: 'FREE', value: expect.anything() });
    });

    it('allows a fixed value above 100', async () => {
      const { user, event } = await createEventContext();

      await expect(
        service.create(
          event.id,
          owner(user.id),
          createDto('BIG', { value: 500 }),
        ),
      ).resolves.toMatchObject({ code: 'BIG' });
    });

    it('rejects a duplicated code globally', async () => {
      const first = await createEventContext();
      const second = await createEventContext();
      await createCoupon(prisma, first.event.id, { code: 'DUPLICATED' });

      await expect(
        service.create(
          second.event.id,
          owner(second.user.id),
          createDto('duplicated'),
        ),
      ).rejects.toMatchObject({ code: 'P2002' });
    });

    it('rejects an event owned by another organizer', async () => {
      const first = await createEventContext();
      const second = await createEventContext();

      await expect(
        service.create(
          second.event.id,
          owner(first.user.id),
          createDto('FOREIGN'),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets an admin create a coupon for any event', async () => {
      const { event } = await createEventContext();
      const admin = await createBuyer(prisma, { role: 'ADMIN' });

      await expect(
        service.create(
          event.id,
          { id: admin.id, role: 'ADMIN' },
          createDto('ADMIN'),
        ),
      ).resolves.toMatchObject({ code: 'ADMIN' });
    });

    it('rejects an unknown event', async () => {
      const { user } = await createEventContext();

      await expect(
        service.create(
          '00000000-0000-0000-0000-000000000000',
          owner(user.id),
          createDto('MISSING'),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getAll', () => {
    it('returns only coupons from the requested event with filters', async () => {
      const first = await createEventContext();
      const second = await createEventContext();
      const fixed = await createCoupon(prisma, first.event.id, {
        code: 'FIRST10',
        discountType: 'FIXED',
      });
      await createCoupon(prisma, first.event.id, {
        code: 'FIRST20',
        discountType: 'PERCENTAGE',
      });
      await createCoupon(prisma, second.event.id, { code: 'OTHER' });

      const all = await service.getAll(
        owner(first.user.id),
        first.event.id,
        {},
      );
      expect(all.data).toHaveLength(2);
      expect(all.meta.total).toBe(2);

      const byCode = await service.getAll(
        owner(first.user.id),
        first.event.id,
        {
          code: 'first1',
        },
      );
      expect(byCode.data).toHaveLength(1);
      expect(byCode.data[0].code).toBe('FIRST10');

      const byType = await service.getAll(
        owner(first.user.id),
        first.event.id,
        {
          discountType: 'FIXED',
        },
      );
      expect(byType.data).toHaveLength(1);
      expect(byType.data[0].id).toBe(fixed.id);
    });

    it('paginates the listing', async () => {
      const { user, event } = await createEventContext();
      for (let index = 0; index < 3; index += 1) {
        await createCoupon(prisma, event.id, { code: `CODE${index}` });
      }

      const result = await service.getAll(owner(user.id), event.id, {
        page: 1,
        limit: 2,
      });

      expect(result.data).toHaveLength(2);
      expect(result.meta).toMatchObject({
        total: 3,
        page: 1,
        limit: 2,
        totalPages: 2,
      });
    });

    it('rejects a foreign event', async () => {
      const first = await createEventContext();
      const second = await createEventContext();

      await expect(
        service.getAll(owner(first.user.id), second.event.id, {}),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getOne', () => {
    it('returns a coupon from the event', async () => {
      const { user, event } = await createEventContext();
      const coupon = await createCoupon(prisma, event.id);

      await expect(
        service.getOne(owner(user.id), event.id, coupon.id),
      ).resolves.toMatchObject({ id: coupon.id });
    });

    it('does not return a coupon from another event', async () => {
      const first = await createEventContext();
      const second = await createEventContext();
      const coupon = await createCoupon(prisma, second.event.id);

      await expect(
        service.getOne(owner(first.user.id), first.event.id, coupon.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates and normalizes the code', async () => {
      const { user, event } = await createEventContext();
      const coupon = await createCoupon(prisma, event.id);

      await expect(
        service.update(coupon.id, event.id, owner(user.id), {
          code: '  updated  ',
        }),
      ).resolves.toMatchObject({ code: 'UPDATED' });
    });

    it('validates value when both value and type are provided', async () => {
      const { user, event } = await createEventContext();
      const coupon = await createCoupon(prisma, event.id);

      await expect(
        service.update(coupon.id, event.id, owner(user.id), {
          discountType: 'PERCENTAGE',
          value: 101,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('can deactivate a coupon', async () => {
      const { user, event } = await createEventContext();
      const coupon = await createCoupon(prisma, event.id);

      await expect(
        service.update(coupon.id, event.id, owner(user.id), {
          active: false,
        }),
      ).resolves.toMatchObject({ active: false });
    });

    it.todo('validates a partial update that changes only a percentage value');

    it('rejects an update through another event', async () => {
      const first = await createEventContext();
      const second = await createEventContext();
      const coupon = await createCoupon(prisma, second.event.id);

      await expect(
        service.update(coupon.id, first.event.id, owner(first.user.id), {
          active: false,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an update by another organizer', async () => {
      const first = await createEventContext();
      const second = await createEventContext();
      const coupon = await createCoupon(prisma, second.event.id);

      await expect(
        service.update(coupon.id, second.event.id, owner(first.user.id), {
          active: false,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('deletes a coupon from the event', async () => {
      const { user, event } = await createEventContext();
      const coupon = await createCoupon(prisma, event.id);

      await service.delete(coupon.id, event.id, owner(user.id));

      await expect(
        prisma.coupon.findUnique({ where: { id: coupon.id } }),
      ).resolves.toBeNull();
    });

    it('does not delete a coupon through another event', async () => {
      const first = await createEventContext();
      const second = await createEventContext();
      const coupon = await createCoupon(prisma, second.event.id);

      await expect(
        service.delete(coupon.id, first.event.id, owner(first.user.id)),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        prisma.coupon.findUnique({ where: { id: coupon.id } }),
      ).resolves.not.toBeNull();
    });

    it('rejects deletion by another organizer', async () => {
      const first = await createEventContext();
      const second = await createEventContext();
      const coupon = await createCoupon(prisma, second.event.id);

      await expect(
        service.delete(coupon.id, second.event.id, owner(first.user.id)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
