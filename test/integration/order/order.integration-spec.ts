import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { EventStatus } from 'generated/prisma/enums';
import { OrderModule } from 'src/order/order.module';
import { OrderService } from 'src/order/order.service';
import { PrismaService } from 'src/prisma.service';
import { resetDatabase } from '../setup/database';
import {
  createBuyer,
  createCategory,
  createCoupon,
  createEvent,
  createOrganizer,
  createVenue,
} from '../support/factories';
import { createIntegrationModule } from '../support/test-module';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

describe('OrderService (integration)', () => {
  let service: OrderService;
  let configService: ConfigService;
  let prisma: PrismaService;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const context = await createIntegrationModule([OrderModule]);
    service = context.moduleRef.get(OrderService);
    configService = context.moduleRef.get(ConfigService);
    prisma = context.prisma;
    close = context.close;
  });

  afterAll(async () => {
    await close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  async function createSalesSetup(
    options: {
      stock?: number;
      price?: number;
      eventStatus?: EventStatus;
      salesStart?: Date;
      salesEnd?: Date;
      startDate?: Date;
    } = {},
  ) {
    const { user: organizer, profile } = await createOrganizer(prisma);
    const venue = await createVenue(prisma, profile.id, { capacity: 100 });
    const event = await createEvent(prisma, profile.id, venue.id, {
      status: options.eventStatus ?? 'PUBLISHED',
      startDate: options.startDate ?? new Date(Date.now() + 7 * DAY),
    });
    const category = await createCategory(prisma, event.id, {
      price: options.price ?? 50,
      quantity: options.stock ?? 10,
      salesStart: options.salesStart,
      salesEnd: options.salesEnd,
    });

    return { organizer, profile, venue, event, category };
  }

  function createOrderDto(categoryId: string, quantity = 1) {
    return { items: [{ categoryId, quantity }] };
  }

  describe('create', () => {
    it('persists order, items, tickets and payment with the correct amounts', async () => {
      const { category, event } = await createSalesSetup({
        price: 50,
        stock: 10,
      });
      const buyer = await createBuyer(prisma);
      const startedAt = Date.now();

      const { order, payment } = await service.create(
        createOrderDto(category.id, 2),
        buyer.id,
      );
      const finishedAt = Date.now();

      expect(Number(order.subtotal)).toBe(100);
      expect(Number(order.fee)).toBe(5);
      expect(Number(order.discount)).toBe(0);
      expect(Number(order.total)).toBe(105);
      expect(order.status).toBe('PENDING');
      expect(order.idempotencyKey).toBeNull();
      expect(order.reservedUntil).toBeInstanceOf(Date);
      expect(order.reservedUntil!.getTime()).toBeGreaterThanOrEqual(
        startedAt + 15 * MINUTE - 1000,
      );
      expect(order.reservedUntil!.getTime()).toBeLessThanOrEqual(
        finishedAt + 15 * MINUTE + 1000,
      );

      expect(order.orderItems).toHaveLength(1);
      expect(order.orderItems[0]).toMatchObject({
        quantity: 2,
        categoryId: category.id,
      });
      expect(Number(order.orderItems[0].unitPrice)).toBe(50);
      expect(Number(order.orderItems[0].total)).toBe(100);
      expect(order.orderItems[0].tickets).toHaveLength(2);
      expect(
        order.orderItems[0].tickets.every(
          (ticket) => ticket.status === 'VALID' && ticket.eventId === event.id,
        ),
      ).toBe(true);

      expect(payment).toMatchObject({
        orderId: order.id,
        status: 'PENDING',
      });
      expect(Number(payment.amount)).toBe(105);

      const storedCategory = await prisma.category.findUniqueOrThrow({
        where: { id: category.id },
      });
      expect(storedCategory.quantity).toBe(8);

      const storedOrder = await prisma.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { payment: true, orderItems: { include: { tickets: true } } },
      });
      expect(storedOrder.payment).not.toBeNull();
      expect(storedOrder.orderItems[0].tickets).toHaveLength(2);
    });

    it('merges duplicated categories and decrements stock only once', async () => {
      const { category } = await createSalesSetup({ stock: 10 });
      const buyer = await createBuyer(prisma);

      const { order } = await service.create(
        {
          items: [
            { categoryId: category.id, quantity: 1 },
            { categoryId: category.id, quantity: 2 },
          ],
        },
        buyer.id,
      );

      expect(order.orderItems).toHaveLength(1);
      expect(order.orderItems[0].quantity).toBe(3);
      expect(order.orderItems[0].tickets).toHaveLength(3);

      await expect(
        prisma.category.findUniqueOrThrow({ where: { id: category.id } }),
      ).resolves.toMatchObject({ quantity: 7 });
    });

    it('supports multiple categories from the same event', async () => {
      const { event, category } = await createSalesSetup({ stock: 10 });
      const secondCategory = await createCategory(prisma, event.id, {
        name: 'Second Category',
        price: 30,
        quantity: 5,
      });
      const buyer = await createBuyer(prisma);

      const { order } = await service.create(
        {
          items: [
            { categoryId: category.id, quantity: 1 },
            { categoryId: secondCategory.id, quantity: 2 },
          ],
        },
        buyer.id,
      );

      expect(Number(order.subtotal)).toBe(110);
      expect(Number(order.fee)).toBe(5.5);
      expect(Number(order.total)).toBe(115.5);
      expect(order.orderItems).toHaveLength(2);
      expect(order.orderItems.flatMap((item) => item.tickets)).toHaveLength(3);
    });

    it('rejects categories from different events without changing stock', async () => {
      const first = await createSalesSetup({ stock: 5 });
      const second = await createSalesSetup({ stock: 5 });
      const buyer = await createBuyer(prisma);

      await expect(
        service.create(
          {
            items: [
              { categoryId: first.category.id, quantity: 1 },
              { categoryId: second.category.id, quantity: 1 },
            ],
          },
          buyer.id,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        prisma.category.findMany({
          where: { id: { in: [first.category.id, second.category.id] } },
          orderBy: { id: 'asc' },
        }),
      ).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: first.category.id, quantity: 5 }),
          expect.objectContaining({ id: second.category.id, quantity: 5 }),
        ]),
      );
      await expect(prisma.order.count()).resolves.toBe(0);
    });

    it('rejects an unknown category', async () => {
      const buyer = await createBuyer(prisma);

      await expect(
        service.create(
          {
            items: [
              {
                categoryId: '00000000-0000-0000-0000-000000000000',
                quantity: 1,
              },
            ],
          },
          buyer.id,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it.each<EventStatus>(['DRAFT', 'FINISHED', 'CANCELED'])(
      'rejects orders for an event with status %s',
      async (status) => {
        const { category } = await createSalesSetup({
          eventStatus: status,
        });
        const buyer = await createBuyer(prisma);

        await expect(
          service.create(createOrderDto(category.id), buyer.id),
        ).rejects.toBeInstanceOf(BadRequestException);
        await expect(
          prisma.category.findUniqueOrThrow({
            where: { id: category.id },
          }),
        ).resolves.toMatchObject({ quantity: 10 });
      },
    );

    it('rejects a category whose sales window has not started', async () => {
      const { category } = await createSalesSetup({
        salesStart: new Date(Date.now() + DAY),
      });
      const buyer = await createBuyer(prisma);

      await expect(
        service.create(createOrderDto(category.id), buyer.id),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a category whose sales window has ended', async () => {
      const { category } = await createSalesSetup({
        salesEnd: new Date(Date.now() - DAY),
      });
      const buyer = await createBuyer(prisma);

      await expect(
        service.create(createOrderDto(category.id), buyer.id),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an event that has already started', async () => {
      const { category } = await createSalesSetup({
        startDate: new Date(Date.now() - DAY),
      });
      const buyer = await createBuyer(prisma);

      await expect(
        service.create(createOrderDto(category.id), buyer.id),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects insufficient stock and rolls the whole order back', async () => {
      const { event, category } = await createSalesSetup({ stock: 5 });
      const secondCategory = await createCategory(prisma, event.id, {
        name: 'Low Stock',
        price: 20,
        quantity: 1,
      });
      const buyer = await createBuyer(prisma);

      await expect(
        service.create(
          {
            items: [
              { categoryId: category.id, quantity: 1 },
              { categoryId: secondCategory.id, quantity: 2 },
            ],
          },
          buyer.id,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      const categories = await prisma.category.findMany({
        where: { id: { in: [category.id, secondCategory.id] } },
        orderBy: { id: 'asc' },
      });
      expect(categories.find((item) => item.id === category.id)?.quantity).toBe(
        5,
      );
      expect(
        categories.find((item) => item.id === secondCategory.id)?.quantity,
      ).toBe(1);
      await expect(prisma.order.count()).resolves.toBe(0);
      await expect(prisma.payment.count()).resolves.toBe(0);
      await expect(prisma.ticket.count()).resolves.toBe(0);
    });

    it('rejects an order when the aggregated quantity exceeds stock', async () => {
      const { category } = await createSalesSetup({ stock: 2 });
      const buyer = await createBuyer(prisma);

      await expect(
        service.create(
          {
            items: [
              { categoryId: category.id, quantity: 2 },
              { categoryId: category.id, quantity: 1 },
            ],
          },
          buyer.id,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        prisma.category.findUniqueOrThrow({ where: { id: category.id } }),
      ).resolves.toMatchObject({ quantity: 2 });
    });

    it('uses the configured reservation TTL', async () => {
      const { category } = await createSalesSetup();
      const buyer = await createBuyer(prisma);
      const startedAt = Date.now();
      const spy = jest.spyOn(configService, 'get').mockReturnValue(1 as never);

      try {
        const { order } = await service.create(
          createOrderDto(category.id),
          buyer.id,
        );

        expect(order.reservedUntil!.getTime()).toBeGreaterThanOrEqual(
          startedAt + MINUTE - 1000,
        );
        expect(order.reservedUntil!.getTime()).toBeLessThanOrEqual(
          Date.now() + MINUTE + 1000,
        );
      } finally {
        spy.mockRestore();
      }
    });

    it('generates unique ticket codes and QR codes for the order quantity', async () => {
      const { category } = await createSalesSetup({ stock: 20 });
      const buyer = await createBuyer(prisma);

      const { order } = await service.create(
        createOrderDto(category.id, 5),
        buyer.id,
      );

      const tickets = order.orderItems.flatMap((item) => item.tickets);
      expect(tickets).toHaveLength(5);
      expect(new Set(tickets.map((ticket) => ticket.code)).size).toBe(5);
      expect(new Set(tickets.map((ticket) => ticket.qrCode)).size).toBe(5);
      expect(tickets.every((ticket) => ticket.code.startsWith('TKT-'))).toBe(
        true,
      );
      expect(
        tickets.every((ticket) => ticket.qrCode.includes(ticket.code)),
      ).toBe(true);
    });
  });

  describe('coupons', () => {
    it('applies a fixed coupon and consumes one use', async () => {
      const { event, category } = await createSalesSetup({ price: 50 });
      const coupon = await createCoupon(prisma, event.id, {
        code: 'FIXED10',
        discountType: 'FIXED',
        value: 10,
        maxUses: 5,
      });
      const buyer = await createBuyer(prisma);

      const { order } = await service.create(
        {
          ...createOrderDto(category.id, 2),
          couponCode: ' fixed10 ',
        },
        buyer.id,
      );

      expect(Number(order.discount)).toBe(10);
      expect(Number(order.total)).toBe(95);
      expect(order.couponId).toBe(coupon.id);

      await expect(
        prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } }),
      ).resolves.toMatchObject({ currentUses: 1 });
    });

    it('applies a percentage coupon with two decimal rounding', async () => {
      const { event, category } = await createSalesSetup({ price: 50 });
      await createCoupon(prisma, event.id, {
        code: 'OFF33',
        discountType: 'PERCENTAGE',
        value: 33.33,
      });
      const buyer = await createBuyer(prisma);

      const { order } = await service.create(
        {
          ...createOrderDto(category.id, 2),
          couponCode: 'OFF33',
        },
        buyer.id,
      );

      expect(Number(order.subtotal)).toBe(100);
      expect(Number(order.discount)).toBe(33.33);
      expect(Number(order.total)).toBe(71.67);
    });

    it('caps a fixed discount at the subtotal', async () => {
      const { event, category } = await createSalesSetup({ price: 50 });
      await createCoupon(prisma, event.id, {
        code: 'HUGE',
        discountType: 'FIXED',
        value: 1000,
      });
      const buyer = await createBuyer(prisma);

      const { order } = await service.create(
        {
          ...createOrderDto(category.id, 2),
          couponCode: 'HUGE',
        },
        buyer.id,
      );

      expect(Number(order.subtotal)).toBe(100);
      expect(Number(order.discount)).toBe(100);
      expect(Number(order.total)).toBe(5);
    });

    it('applies a coupon without event scope', async () => {
      const { category } = await createSalesSetup({ price: 50 });
      await createCoupon(prisma, null, {
        code: 'GLOBAL',
        discountType: 'FIXED',
        value: 5,
      });
      const buyer = await createBuyer(prisma);

      const { order } = await service.create(
        {
          ...createOrderDto(category.id),
          couponCode: 'GLOBAL',
        },
        buyer.id,
      );

      expect(Number(order.discount)).toBe(5);
      expect(Number(order.total)).toBe(47.5);
    });

    it('rejects a coupon scoped to another event and restores stock', async () => {
      const first = await createSalesSetup({ price: 50 });
      const second = await createSalesSetup({ price: 50 });
      await createCoupon(prisma, second.event.id, {
        code: 'OTHER',
        discountType: 'FIXED',
        value: 10,
      });
      const buyer = await createBuyer(prisma);

      await expect(
        service.create(
          {
            ...createOrderDto(first.category.id),
            couponCode: 'OTHER',
          },
          buyer.id,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        prisma.category.findUniqueOrThrow({
          where: { id: first.category.id },
        }),
      ).resolves.toMatchObject({ quantity: 10 });
      await expect(prisma.order.count()).resolves.toBe(0);
    });

    it.each([
      ['inactive', { active: false }],
      ['expired', { expiresAt: new Date(Date.now() - DAY) }],
      ['exhausted', { maxUses: 1, currentUses: 1 }],
    ])('rejects a %s coupon', async (_label, overrides) => {
      const { event, category } = await createSalesSetup({ price: 50 });
      await createCoupon(prisma, event.id, {
        code: 'INVALID',
        discountType: 'FIXED',
        value: 10,
        ...overrides,
      });
      const buyer = await createBuyer(prisma);

      await expect(
        service.create(
          {
            ...createOrderDto(category.id),
            couponCode: 'INVALID',
          },
          buyer.id,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        prisma.category.findUniqueOrThrow({ where: { id: category.id } }),
      ).resolves.toMatchObject({ quantity: 10 });
    });

    it('rejects an unknown coupon', async () => {
      const { category } = await createSalesSetup();
      const buyer = await createBuyer(prisma);

      await expect(
        service.create(
          {
            ...createOrderDto(category.id),
            couponCode: 'MISSING',
          },
          buyer.id,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('keeps coupon consumption atomic under concurrency', async () => {
      const { event, category } = await createSalesSetup({
        stock: 10,
        price: 50,
      });
      const coupon = await createCoupon(prisma, event.id, {
        code: 'ONCE',
        discountType: 'FIXED',
        value: 10,
        maxUses: 1,
      });
      const firstBuyer = await createBuyer(prisma);
      const secondBuyer = await createBuyer(prisma);

      const results = await Promise.allSettled([
        service.create(
          { ...createOrderDto(category.id), couponCode: 'ONCE' },
          firstBuyer.id,
        ),
        service.create(
          { ...createOrderDto(category.id), couponCode: 'ONCE' },
          secondBuyer.id,
        ),
      ]);

      const fulfilled = results.filter(
        (result) => result.status === 'fulfilled',
      );
      const rejected = results.filter((result) => result.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        BadRequestException,
      );

      await expect(
        prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } }),
      ).resolves.toMatchObject({ currentUses: 1 });
      await expect(
        prisma.category.findUniqueOrThrow({ where: { id: category.id } }),
      ).resolves.toMatchObject({ quantity: 9 });
      await expect(prisma.order.count()).resolves.toBe(1);
    });
  });

  describe('idempotency', () => {
    it('replays the existing order for the same user and key', async () => {
      const { category } = await createSalesSetup({ stock: 10 });
      const buyer = await createBuyer(prisma);
      const idempotencyKey = 'checkout-123';

      const first = await service.create(
        createOrderDto(category.id, 2),
        buyer.id,
        idempotencyKey,
      );
      const second = await service.create(
        createOrderDto(category.id, 2),
        buyer.id,
        idempotencyKey,
      );

      expect(second.order.id).toBe(first.order.id);
      expect(second.payment.id).toBe(first.payment.id);
      await expect(
        prisma.category.findUniqueOrThrow({ where: { id: category.id } }),
      ).resolves.toMatchObject({ quantity: 8 });
      await expect(prisma.order.count()).resolves.toBe(1);
      await expect(prisma.ticket.count()).resolves.toBe(2);

      const expectedHash = createHash('sha256')
        .update(idempotencyKey)
        .digest('hex');
      await expect(
        prisma.order.findUniqueOrThrow({ where: { id: first.order.id } }),
      ).resolves.toMatchObject({ idempotencyKey: expectedHash });
    });

    it('allows the same key for different users', async () => {
      const { category } = await createSalesSetup({ stock: 10 });
      const firstBuyer = await createBuyer(prisma);
      const secondBuyer = await createBuyer(prisma);

      const first = await service.create(
        createOrderDto(category.id),
        firstBuyer.id,
        'shared-key',
      );
      const second = await service.create(
        createOrderDto(category.id),
        secondBuyer.id,
        'shared-key',
      );

      expect(second.order.id).not.toBe(first.order.id);
      await expect(prisma.order.count()).resolves.toBe(2);
      await expect(
        prisma.category.findUniqueOrThrow({ where: { id: category.id } }),
      ).resolves.toMatchObject({ quantity: 8 });
    });

    it('serializes concurrent requests with the same key', async () => {
      const { category } = await createSalesSetup({ stock: 10 });
      const buyer = await createBuyer(prisma);

      const results = await Promise.allSettled([
        service.create(createOrderDto(category.id, 2), buyer.id, 'parallel'),
        service.create(createOrderDto(category.id, 2), buyer.id, 'parallel'),
      ]);

      const fulfilled = results.filter(
        (result) => result.status === 'fulfilled',
      );
      expect(fulfilled.length).toBeGreaterThanOrEqual(1);

      const orderIds = new Set(
        fulfilled.map(
          (result) =>
            (result as PromiseFulfilledResult<{ order: { id: string } }>).value
              .order.id,
        ),
      );
      expect(orderIds.size).toBe(1);
      await expect(prisma.order.count()).resolves.toBe(1);
      await expect(prisma.ticket.count()).resolves.toBe(2);
      await expect(
        prisma.category.findUniqueOrThrow({ where: { id: category.id } }),
      ).resolves.toMatchObject({ quantity: 8 });
    });
  });

  describe('concurrency', () => {
    it('allows only one buyer to take the last available ticket', async () => {
      const { category } = await createSalesSetup({ stock: 1 });
      const firstBuyer = await createBuyer(prisma);
      const secondBuyer = await createBuyer(prisma);

      const results = await Promise.allSettled([
        service.create(createOrderDto(category.id), firstBuyer.id),
        service.create(createOrderDto(category.id), secondBuyer.id),
      ]);

      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === 'rejected'),
      ).toHaveLength(1);
      expect(
        (
          results.find(
            (result) => result.status === 'rejected',
          ) as PromiseRejectedResult
        ).reason,
      ).toBeInstanceOf(BadRequestException);

      await expect(
        prisma.category.findUniqueOrThrow({ where: { id: category.id } }),
      ).resolves.toMatchObject({ quantity: 0 });
      await expect(prisma.order.count()).resolves.toBe(1);
      await expect(prisma.ticket.count()).resolves.toBe(1);
    });
  });
});
