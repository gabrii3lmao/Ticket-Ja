import { OrderModule } from 'src/order/order.module';
import { OrderExpirationService } from 'src/order/order-expiration/order-expiration.service';
import { PrismaService } from 'src/prisma.service';
import { resetDatabase } from '../setup/database';
import {
  createBuyer,
  createCategory,
  createEvent,
  createOrder,
  createOrderItem,
  createOrganizer,
  createPayment,
  createTicket,
  createVenue,
} from '../support/factories';
import { createIntegrationModule } from '../support/test-module';

const MINUTE = 60 * 1000;

describe('OrderExpirationService (integration)', () => {
  let service: OrderExpirationService;
  let prisma: PrismaService;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const context = await createIntegrationModule([OrderModule]);
    service = context.moduleRef.get(OrderExpirationService);
    prisma = context.prisma;
    close = context.close;
  });

  afterAll(async () => {
    await close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  async function createExpirableOrder(
    options: {
      reservedUntil?: Date | null;
      status?: 'PENDING' | 'PAID' | 'CANCELED';
      withPayment?: boolean;
      quantity?: number;
    } = {},
  ) {
    const { profile } = await createOrganizer(prisma);
    const venue = await createVenue(prisma, profile.id, { capacity: 50 });
    const event = await createEvent(prisma, profile.id, venue.id, {
      status: 'PUBLISHED',
    });
    const category = await createCategory(prisma, event.id, {
      quantity: 5,
      price: 50,
    });
    const buyer = await createBuyer(prisma);
    const quantity = options.quantity ?? 1;
    const order = await createOrder(prisma, buyer.id, {
      status: options.status ?? 'PENDING',
      subtotal: 50 * quantity,
      fee: 2.5 * quantity,
      total: 52.5 * quantity,
      reservedUntil:
        options.reservedUntil === undefined
          ? new Date(Date.now() - MINUTE)
          : options.reservedUntil,
    });
    const item = await createOrderItem(prisma, order.id, category.id, {
      quantity,
      unitPrice: 50,
      total: 50 * quantity,
    });
    const tickets = await Promise.all(
      Array.from({ length: quantity }, () =>
        createTicket(prisma, {
          userId: buyer.id,
          orderItemId: item.id,
          eventId: event.id,
        }),
      ),
    );
    const payment =
      options.withPayment === false
        ? null
        : await createPayment(prisma, order.id, {
            amount: 52.5 * quantity,
          });

    return { buyer, event, category, order, item, tickets, payment };
  }

  it('cancels an expired reservation and releases its stock', async () => {
    const setup = await createExpirableOrder();

    await expect(service.expirePendingReservations()).resolves.toBe(1);

    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: setup.order.id } }),
    ).resolves.toMatchObject({ status: 'CANCELED' });

    await expect(
      prisma.category.findUniqueOrThrow({ where: { id: setup.category.id } }),
    ).resolves.toMatchObject({ quantity: 6 });

    const payment = await prisma.payment.findUniqueOrThrow({
      where: { id: setup.payment!.id },
    });
    expect(payment.status).toBe('REJECTED');
    expect(payment.rejectReason).toBe('Reservation TTL expired');
    expect(payment.rejectedAt).toBeInstanceOf(Date);

    const tickets = await prisma.ticket.findMany({
      where: { id: { in: setup.tickets.map((ticket) => ticket.id) } },
    });
    expect(tickets.every((ticket) => ticket.status === 'CANCELED')).toBe(true);
  });

  it('ignores reservations whose TTL has not expired', async () => {
    const setup = await createExpirableOrder({
      reservedUntil: new Date(Date.now() + MINUTE),
    });

    await expect(service.expirePendingReservations()).resolves.toBe(0);
    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: setup.order.id } }),
    ).resolves.toMatchObject({ status: 'PENDING' });
    await expect(
      prisma.category.findUniqueOrThrow({ where: { id: setup.category.id } }),
    ).resolves.toMatchObject({ quantity: 5 });
  });

  it('ignores reservations without a TTL', async () => {
    const setup = await createExpirableOrder({ reservedUntil: null });

    await expect(service.expirePendingReservations()).resolves.toBe(0);
    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: setup.order.id } }),
    ).resolves.toMatchObject({ status: 'PENDING' });
  });

  it.each(['PAID', 'CANCELED'] as const)(
    'does not touch a %s order even when its TTL has passed',
    async (status) => {
      const setup = await createExpirableOrder({ status });

      await expect(service.expirePendingReservations()).resolves.toBe(0);
      await expect(
        prisma.order.findUniqueOrThrow({ where: { id: setup.order.id } }),
      ).resolves.toMatchObject({ status });
      await expect(
        prisma.category.findUniqueOrThrow({ where: { id: setup.category.id } }),
      ).resolves.toMatchObject({ quantity: 5 });
    },
  );

  it('ignores pending orders without a payment', async () => {
    const setup = await createExpirableOrder({ withPayment: false });

    await expect(service.expirePendingReservations()).resolves.toBe(0);
    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: setup.order.id } }),
    ).resolves.toMatchObject({ status: 'PENDING' });
  });

  it('processes every expired reservation in a batch', async () => {
    const setups = await Promise.all([
      createExpirableOrder({ quantity: 1 }),
      createExpirableOrder({ quantity: 1 }),
      createExpirableOrder({ quantity: 1 }),
    ]);
    const future = await createExpirableOrder({
      reservedUntil: new Date(Date.now() + MINUTE),
    });

    await expect(service.expirePendingReservations()).resolves.toBe(3);

    const orders = await prisma.order.findMany({
      where: { id: { in: setups.map((setup) => setup.order.id) } },
    });
    expect(orders.every((order) => order.status === 'CANCELED')).toBe(true);
    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: future.order.id } }),
    ).resolves.toMatchObject({ status: 'PENDING' });

    const categories = await prisma.category.findMany({
      where: { id: { in: setups.map((setup) => setup.category.id) } },
    });
    expect(categories.every((category) => category.quantity === 6)).toBe(true);
  });

  it('is idempotent across executions', async () => {
    const setup = await createExpirableOrder();

    await expect(service.expirePendingReservations()).resolves.toBe(1);
    await expect(service.expirePendingReservations()).resolves.toBe(0);

    await expect(
      prisma.category.findUniqueOrThrow({ where: { id: setup.category.id } }),
    ).resolves.toMatchObject({ quantity: 6 });
    const tickets = await prisma.ticket.findMany({
      where: { id: { in: setup.tickets.map((ticket) => ticket.id) } },
    });
    expect(tickets.every((ticket) => ticket.status === 'CANCELED')).toBe(true);
  });

  it('does not affect an order that was paid before expiration runs', async () => {
    const setup = await createExpirableOrder();
    await prisma.order.update({
      where: { id: setup.order.id },
      data: { status: 'PAID' },
    });
    await prisma.payment.update({
      where: { id: setup.payment!.id },
      data: { status: 'APPROVED' },
    });

    await expect(service.expirePendingReservations()).resolves.toBe(0);
    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: setup.order.id } }),
    ).resolves.toMatchObject({ status: 'PAID' });
    await expect(
      prisma.category.findUniqueOrThrow({ where: { id: setup.category.id } }),
    ).resolves.toMatchObject({ quantity: 5 });
  });

  it.todo('restores coupon usage when a reservation expires');
});
