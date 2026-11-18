import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CategoryModule } from 'src/category/category.module';
import { CategoryService } from 'src/category/category.service';
import { PrismaService } from 'src/prisma.service';
import { resetDatabase } from '../setup/database';
import {
  createBuyer,
  createCategory,
  createEvent,
  createOrder,
  createOrderItem,
  createOrganizer,
  createVenue,
} from '../support/factories';
import { createIntegrationModule } from '../support/test-module';

const DAY = 24 * 60 * 60 * 1000;

describe('CategoryService (integration)', () => {
  let service: CategoryService;
  let prisma: PrismaService;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const context = await createIntegrationModule([CategoryModule]);
    service = context.moduleRef.get(CategoryService);
    prisma = context.prisma;
    close = context.close;
  });

  afterAll(async () => {
    await close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  async function createEventContext(options: { capacity?: number } = {}) {
    const { user, profile } = await createOrganizer(prisma);
    const venue = await createVenue(prisma, profile.id, {
      capacity: options.capacity ?? 100,
    });
    const event = await createEvent(prisma, profile.id, venue.id, {
      status: 'PUBLISHED',
      startDate: new Date(Date.now() + 10 * DAY),
    });
    return { user, profile, venue, event };
  }

  function owner(userId: string) {
    return { id: userId, role: 'ORGANIZER' as const };
  }

  describe('create', () => {
    it('creates a category for the owned event', async () => {
      const { user, event } = await createEventContext();

      const category = await service.create(
        {
          name: 'VIP',
          price: 150,
          quantity: 10,
        },
        event.id,
        owner(user.id),
      );

      expect(category).toMatchObject({
        name: 'VIP',
        eventId: event.id,
        quantity: 10,
      });
      await expect(
        prisma.category.findUniqueOrThrow({ where: { id: category.id } }),
      ).resolves.toMatchObject({ eventId: event.id });
    });

    it('allows the total allocation to reach exactly the venue capacity', async () => {
      const { user, event } = await createEventContext({ capacity: 100 });
      await createCategory(prisma, event.id, { quantity: 40 });

      await expect(
        service.create(
          { name: 'Exact', price: 50, quantity: 60 },
          event.id,
          owner(user.id),
        ),
      ).resolves.toMatchObject({ quantity: 60 });
    });

    it('rejects an allocation above the venue capacity', async () => {
      const { user, event } = await createEventContext({ capacity: 100 });
      await createCategory(prisma, event.id, { quantity: 40 });

      await expect(
        service.create(
          { name: 'Overflow', price: 50, quantity: 61 },
          event.id,
          owner(user.id),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        prisma.category.count({ where: { eventId: event.id } }),
      ).resolves.toBe(1);
    });

    it('counts pending and paid order items but not canceled ones', async () => {
      const { user, event } = await createEventContext({ capacity: 100 });
      const buyer = await createBuyer(prisma);
      await createCategory(prisma, event.id, { quantity: 10 });
      const pendingOrder = await createOrder(prisma, buyer.id, {
        status: 'PENDING',
      });
      const paidOrder = await createOrder(prisma, buyer.id, { status: 'PAID' });
      const canceledOrder = await createOrder(prisma, buyer.id, {
        status: 'CANCELED',
      });
      await createOrderItem(
        prisma,
        pendingOrder.id,
        (
          await prisma.category.findFirstOrThrow({
            where: { eventId: event.id },
          })
        ).id,
        { quantity: 5 },
      );
      await createOrderItem(
        prisma,
        paidOrder.id,
        (
          await prisma.category.findFirstOrThrow({
            where: { eventId: event.id },
          })
        ).id,
        { quantity: 5 },
      );
      await createOrderItem(
        prisma,
        canceledOrder.id,
        (
          await prisma.category.findFirstOrThrow({
            where: { eventId: event.id },
          })
        ).id,
        { quantity: 30 },
      );

      // Remaining 10 + pending 5 + paid 5 = 20.
      await expect(
        service.create(
          { name: 'Fits', price: 50, quantity: 80 },
          event.id,
          owner(user.id),
        ),
      ).resolves.toMatchObject({ quantity: 80 });

      await expect(
        service.create(
          { name: 'Does Not Fit', price: 50, quantity: 81 },
          event.id,
          owner(user.id),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it.each([
      [
        'sales end after event start',
        {
          salesStart: new Date(Date.now() + DAY),
          salesEnd: new Date(Date.now() + 11 * DAY),
        },
      ],
      [
        'sales start after sales end',
        {
          salesStart: new Date(Date.now() + 5 * DAY),
          salesEnd: new Date(Date.now() + 3 * DAY),
        },
      ],
      [
        'sales start after event start',
        {
          salesStart: new Date(Date.now() + 11 * DAY),
        },
      ],
    ])('rejects an invalid sales window: %s', async (_label, window) => {
      const { user, event } = await createEventContext();

      await expect(
        service.create(
          {
            name: 'Invalid Window',
            price: 50,
            quantity: 10,
            ...window,
          },
          event.id,
          owner(user.id),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an event owned by another organizer', async () => {
      const first = await createEventContext();
      const second = await createEventContext();

      await expect(
        service.create(
          { name: 'Foreign', price: 50, quantity: 1 },
          second.event.id,
          owner(first.user.id),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an unknown event', async () => {
      const { user } = await createEventContext();

      await expect(
        service.create(
          { name: 'Missing', price: 50, quantity: 1 },
          '00000000-0000-0000-0000-000000000000',
          owner(user.id),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('allows an admin to create a category for any event', async () => {
      const { event } = await createEventContext();
      const admin = await createBuyer(prisma, { role: 'ADMIN' });

      await expect(
        service.create(
          { name: 'Admin Category', price: 50, quantity: 1 },
          event.id,
          { id: admin.id, role: 'ADMIN' },
        ),
      ).resolves.toMatchObject({ name: 'Admin Category' });
    });
  });

  describe('findAll', () => {
    it('lists categories of a draft event', async () => {
      const { profile, venue } = await createEventContext();
      const draftEvent = await createEvent(prisma, profile.id, venue.id, {
        status: 'DRAFT',
      });
      const category = await createCategory(prisma, draftEvent.id);

      const result = await service.findAll({}, draftEvent.id);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(category.id);
    });

    it('filters by name, price range and sales dates', async () => {
      const { event } = await createEventContext();
      const salesStart = new Date(Date.now() + DAY);
      const salesEnd = new Date(Date.now() + 3 * DAY);
      const matching = await createCategory(prisma, event.id, {
        name: 'Front Row',
        price: 200,
        salesStart,
        salesEnd,
      });
      await createCategory(prisma, event.id, {
        name: 'Back Row',
        price: 50,
      });

      const byName = await service.findAll({ name: 'front' }, event.id);
      expect(byName.data).toHaveLength(1);
      expect(byName.data[0].id).toBe(matching.id);

      const byPrice = await service.findAll(
        { minPrice: 100, maxPrice: 250 },
        event.id,
      );
      expect(byPrice.data).toHaveLength(1);
      expect(byPrice.data[0].id).toBe(matching.id);

      const bySalesStart = await service.findAll(
        {
          salesStartDate: new Date(
            Date.now() + 12 * 60 * 60 * 1000,
          ).toISOString(),
        },
        event.id,
      );
      expect(bySalesStart.data).toHaveLength(1);

      const bySalesEnd = await service.findAll(
        { salesEndDate: new Date(Date.now() + 4 * DAY).toISOString() },
        event.id,
      );
      expect(bySalesEnd.data).toHaveLength(1);
    });

    it('paginates the listing', async () => {
      const { event } = await createEventContext();
      for (let index = 0; index < 3; index += 1) {
        await createCategory(prisma, event.id, { name: `Category ${index}` });
      }

      const result = await service.findAll(
        { page: 1, limit: 2, sortBy: 'name', sortOrder: 'asc' },
        event.id,
      );

      expect(result.data).toHaveLength(2);
      expect(result.meta).toMatchObject({
        total: 3,
        page: 1,
        limit: 2,
        totalPages: 2,
      });
    });
  });

  describe('findOne', () => {
    it('returns a category from a published event', async () => {
      const { event } = await createEventContext();
      const category = await createCategory(prisma, event.id);

      const result = await service.findOne(category.id);

      expect(result).toMatchObject({ id: category.id });
      expect(result.event).toMatchObject({ id: event.id });
    });

    it('does not expose a category from a draft event', async () => {
      const { profile, venue } = await createEventContext();
      const draftEvent = await createEvent(prisma, profile.id, venue.id, {
        status: 'DRAFT',
      });
      const category = await createCategory(prisma, draftEvent.id);

      await expect(service.findOne(category.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates an owned category', async () => {
      const { user, event } = await createEventContext();
      const category = await createCategory(prisma, event.id);

      await expect(
        service.update(category.id, owner(user.id), {
          name: 'Updated',
          price: 75,
        }),
      ).resolves.toMatchObject({ name: 'Updated', price: expect.anything() });
    });

    it('recalculates capacity when increasing the quantity', async () => {
      const { user, event } = await createEventContext({ capacity: 100 });
      const category = await createCategory(prisma, event.id, {
        quantity: 20,
      });

      await expect(
        service.update(category.id, owner(user.id), { quantity: 100 }),
      ).resolves.toMatchObject({ quantity: 100 });

      await expect(
        service.update(category.id, owner(user.id), { quantity: 101 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows reducing the quantity', async () => {
      const { user, event } = await createEventContext();
      const category = await createCategory(prisma, event.id, {
        quantity: 50,
      });

      await expect(
        service.update(category.id, owner(user.id), { quantity: 10 }),
      ).resolves.toMatchObject({ quantity: 10 });
    });

    it('does not validate quantity when it is omitted', async () => {
      const { user, event } = await createEventContext();
      const category = await createCategory(prisma, event.id);

      await expect(
        service.update(category.id, owner(user.id), { name: 'Renamed' }),
      ).resolves.toMatchObject({ name: 'Renamed', quantity: 10 });
    });

    it('rejects an invalid sales window', async () => {
      const { user, event } = await createEventContext();
      const category = await createCategory(prisma, event.id);

      await expect(
        service.update(category.id, owner(user.id), {
          salesStart: new Date(Date.now() + 5 * DAY),
          salesEnd: new Date(Date.now() + 2 * DAY),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it.todo(
      'validates a partial sales window update against the existing values',
    );

    it('rejects an update by another organizer', async () => {
      const first = await createEventContext();
      const second = await createEventContext();
      const category = await createCategory(prisma, second.event.id);

      await expect(
        service.update(category.id, owner(first.user.id), { name: 'Hijacked' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws when the category does not exist', async () => {
      const { user } = await createEventContext();

      await expect(
        service.update('00000000-0000-0000-0000-000000000000', owner(user.id), {
          name: 'Missing',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes a category without order items', async () => {
      const { user, event } = await createEventContext();
      const category = await createCategory(prisma, event.id);

      await service.remove(category.id, owner(user.id));

      await expect(
        prisma.category.findUnique({ where: { id: category.id } }),
      ).resolves.toBeNull();
    });

    it('refuses to remove a category referenced by an order item', async () => {
      const { user, event } = await createEventContext();
      const category = await createCategory(prisma, event.id);
      const buyer = await createBuyer(prisma);
      const order = await createOrder(prisma, buyer.id);
      await createOrderItem(prisma, order.id, category.id);

      await expect(
        service.remove(category.id, owner(user.id)),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        prisma.category.findUnique({ where: { id: category.id } }),
      ).resolves.not.toBeNull();
    });

    it('refuses to remove a category referenced by a canceled order item', async () => {
      const { user, event } = await createEventContext();
      const category = await createCategory(prisma, event.id);
      const buyer = await createBuyer(prisma);
      const order = await createOrder(prisma, buyer.id, {
        status: 'CANCELED',
      });
      await createOrderItem(prisma, order.id, category.id);

      await expect(
        service.remove(category.id, owner(user.id)),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects removal by another organizer', async () => {
      const first = await createEventContext();
      const second = await createEventContext();
      const category = await createCategory(prisma, second.event.id);

      await expect(
        service.remove(category.id, owner(first.user.id)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws when the category does not exist', async () => {
      const { user } = await createEventContext();

      await expect(
        service.remove('00000000-0000-0000-0000-000000000000', owner(user.id)),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it.todo(
      'prevents two concurrent category creations from exceeding venue capacity',
    );
  });
});
