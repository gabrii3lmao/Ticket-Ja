import { PaymentStatus } from 'generated/prisma/enums';
import { PaymentModule } from 'src/payment/payment.module';
import { PaymentService } from 'src/payment/payment.service';
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

describe('PaymentService (integration)', () => {
  let service: PaymentService;
  let prisma: PrismaService;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const context = await createIntegrationModule([PaymentModule]);
    service = context.moduleRef.get(PaymentService);
    prisma = context.prisma;
    close = context.close;
  });

  afterAll(async () => {
    await close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  async function createOrderWithPayment(
    options: {
      status?: 'PENDING' | 'PAID' | 'CANCELED';
      paymentStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
    } = {},
  ) {
    const buyer = await createBuyer(prisma);
    const order = await createOrder(prisma, buyer.id, {
      subtotal: 100,
      fee: 5,
      total: 105,
      status: options.status ?? 'PENDING',
    });
    const payment = await createPayment(prisma, order.id, {
      amount: 105,
      status: options.paymentStatus ?? 'PENDING',
    });

    return { buyer, order, payment };
  }

  async function createPendingOrderWithStock() {
    const { profile } = await createOrganizer(prisma);
    const venue = await createVenue(prisma, profile.id, { capacity: 50 });
    const event = await createEvent(prisma, profile.id, venue.id, {
      status: 'PUBLISHED',
    });
    const firstCategory = await createCategory(prisma, event.id, {
      name: 'First',
      price: 50,
      quantity: 5,
    });
    const secondCategory = await createCategory(prisma, event.id, {
      name: 'Second',
      price: 20,
      quantity: 3,
    });
    const buyer = await createBuyer(prisma);
    const order = await createOrder(prisma, buyer.id, {
      subtotal: 120,
      fee: 6,
      total: 126,
      status: 'PENDING',
    });
    const firstItem = await createOrderItem(
      prisma,
      order.id,
      firstCategory.id,
      {
        quantity: 2,
        unitPrice: 50,
        total: 100,
      },
    );
    const secondItem = await createOrderItem(
      prisma,
      order.id,
      secondCategory.id,
      {
        quantity: 1,
        unitPrice: 20,
        total: 20,
      },
    );
    const firstTickets = await Promise.all([
      createTicket(prisma, {
        userId: buyer.id,
        orderItemId: firstItem.id,
        eventId: event.id,
      }),
      createTicket(prisma, {
        userId: buyer.id,
        orderItemId: firstItem.id,
        eventId: event.id,
      }),
    ]);
    const secondTicket = await createTicket(prisma, {
      userId: buyer.id,
      orderItemId: secondItem.id,
      eventId: event.id,
    });
    const payment = await createPayment(prisma, order.id, {
      amount: 126,
      status: 'PENDING',
    });

    return {
      buyer,
      event,
      firstCategory,
      secondCategory,
      order,
      payment,
      tickets: [...firstTickets, secondTicket],
    };
  }

  describe('markOrderPaid', () => {
    it('marks a pending order as paid and confirms the payment', async () => {
      const { order, payment } = await createOrderWithPayment();

      await service.markOrderPaid(order.id, payment.id);

      await expect(
        prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
      ).resolves.toMatchObject({ status: 'PAID' });

      const storedPayment = await prisma.payment.findUniqueOrThrow({
        where: { id: payment.id },
      });
      expect(storedPayment.status).toBe('APPROVED');
      expect(storedPayment.confirmedAt).toBeInstanceOf(Date);
    });

    it.each(['PAID', 'CANCELED'] as const)(
      'does not change an order that is already %s',
      async (status) => {
        const { order, payment } = await createOrderWithPayment({
          status,
          paymentStatus: status === 'PAID' ? 'APPROVED' : 'REJECTED',
        });
        const before = await prisma.payment.findUniqueOrThrow({
          where: { id: payment.id },
        });

        await service.markOrderPaid(order.id, payment.id);

        await expect(
          prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
        ).resolves.toMatchObject({ status });
        await expect(
          prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
        ).resolves.toMatchObject({
          status: before.status,
          confirmedAt: before.confirmedAt,
        });
      },
    );

    it('does nothing when the order does not exist', async () => {
      const { payment } = await createOrderWithPayment();

      await expect(
        service.markOrderPaid(
          '00000000-0000-0000-0000-000000000000',
          payment.id,
        ),
      ).resolves.toBeUndefined();

      await expect(
        prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
      ).resolves.toMatchObject({ status: 'PENDING' });
    });

    it('rolls back when the payment does not exist', async () => {
      const { order } = await createOrderWithPayment();

      await expect(
        service.markOrderPaid(order.id, '00000000-0000-0000-0000-000000000000'),
      ).rejects.toBeDefined();

      await expect(
        prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
      ).resolves.toMatchObject({ status: 'PENDING' });
    });

    it.todo(
      'rejects a payment that belongs to another order (invariant not validated)',
    );
  });

  describe('releaseOrder', () => {
    it('releases stock, cancels tickets and cancels the order', async () => {
      const setup = await createPendingOrderWithStock();

      await service.releaseOrder(
        setup.order.id,
        setup.payment.id,
        PaymentStatus.REJECTED,
        'CANCELED',
        'Payment declined',
      );

      const [firstCategory, secondCategory] = await Promise.all([
        prisma.category.findUniqueOrThrow({
          where: { id: setup.firstCategory.id },
        }),
        prisma.category.findUniqueOrThrow({
          where: { id: setup.secondCategory.id },
        }),
      ]);
      expect(firstCategory.quantity).toBe(7);
      expect(secondCategory.quantity).toBe(4);

      const tickets = await prisma.ticket.findMany({
        where: { id: { in: setup.tickets.map((ticket) => ticket.id) } },
      });
      expect(tickets).toHaveLength(3);
      expect(tickets.every((ticket) => ticket.status === 'CANCELED')).toBe(
        true,
      );

      const payment = await prisma.payment.findUniqueOrThrow({
        where: { id: setup.payment.id },
      });
      expect(payment.status).toBe('REJECTED');
      expect(payment.rejectReason).toBe('Payment declined');
      expect(payment.rejectedAt).toBeInstanceOf(Date);

      await expect(
        prisma.order.findUniqueOrThrow({ where: { id: setup.order.id } }),
      ).resolves.toMatchObject({ status: 'CANCELED' });
    });

    it('releases the order without a rejection reason when none is given', async () => {
      const setup = await createPendingOrderWithStock();

      await service.releaseOrder(
        setup.order.id,
        setup.payment.id,
        PaymentStatus.REJECTED,
        'CANCELED',
      );

      const payment = await prisma.payment.findUniqueOrThrow({
        where: { id: setup.payment.id },
      });
      expect(payment.status).toBe('REJECTED');
      expect(payment.rejectReason).toBeNull();
      expect(payment.rejectedAt).toBeNull();
    });

    it('does not restore stock for an already paid order', async () => {
      const setup = await createPendingOrderWithStock();
      await prisma.order.update({
        where: { id: setup.order.id },
        data: { status: 'PAID' },
      });
      await prisma.payment.update({
        where: { id: setup.payment.id },
        data: { status: 'APPROVED' },
      });

      await service.releaseOrder(
        setup.order.id,
        setup.payment.id,
        PaymentStatus.REJECTED,
        'CANCELED',
        'late rejection',
      );

      await expect(
        prisma.category.findUniqueOrThrow({
          where: { id: setup.firstCategory.id },
        }),
      ).resolves.toMatchObject({ quantity: 5 });
      await expect(
        prisma.category.findUniqueOrThrow({
          where: { id: setup.secondCategory.id },
        }),
      ).resolves.toMatchObject({ quantity: 3 });
      await expect(
        prisma.order.findUniqueOrThrow({ where: { id: setup.order.id } }),
      ).resolves.toMatchObject({ status: 'PAID' });
      await expect(
        prisma.payment.findUniqueOrThrow({ where: { id: setup.payment.id } }),
      ).resolves.toMatchObject({ status: 'APPROVED', rejectReason: null });

      const tickets = await prisma.ticket.findMany({
        where: { id: { in: setup.tickets.map((ticket) => ticket.id) } },
      });
      expect(tickets.every((ticket) => ticket.status === 'VALID')).toBe(true);
    });

    it('does not restore stock twice for an already canceled order', async () => {
      const setup = await createPendingOrderWithStock();
      await service.releaseOrder(
        setup.order.id,
        setup.payment.id,
        PaymentStatus.REJECTED,
        'CANCELED',
      );

      await service.releaseOrder(
        setup.order.id,
        setup.payment.id,
        PaymentStatus.REJECTED,
        'CANCELED',
      );

      await expect(
        prisma.category.findUniqueOrThrow({
          where: { id: setup.firstCategory.id },
        }),
      ).resolves.toMatchObject({ quantity: 7 });
      await expect(
        prisma.category.findUniqueOrThrow({
          where: { id: setup.secondCategory.id },
        }),
      ).resolves.toMatchObject({ quantity: 4 });
    });

    it('does nothing when the order does not exist', async () => {
      const { payment } = await createOrderWithPayment();

      await expect(
        service.releaseOrder(
          '00000000-0000-0000-0000-000000000000',
          payment.id,
          PaymentStatus.REJECTED,
          'CANCELED',
        ),
      ).resolves.toBeUndefined();

      await expect(
        prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
      ).resolves.toMatchObject({ status: 'PENDING' });
    });

    it('rolls back the stock release when the payment does not exist', async () => {
      const setup = await createPendingOrderWithStock();

      await expect(
        service.releaseOrder(
          setup.order.id,
          '00000000-0000-0000-0000-000000000000',
          PaymentStatus.REJECTED,
          'CANCELED',
        ),
      ).rejects.toBeDefined();

      await expect(
        prisma.category.findUniqueOrThrow({
          where: { id: setup.firstCategory.id },
        }),
      ).resolves.toMatchObject({ quantity: 5 });
      await expect(
        prisma.order.findUniqueOrThrow({ where: { id: setup.order.id } }),
      ).resolves.toMatchObject({ status: 'PENDING' });
      const tickets = await prisma.ticket.findMany({
        where: { id: { in: setup.tickets.map((ticket) => ticket.id) } },
      });
      expect(tickets.every((ticket) => ticket.status === 'VALID')).toBe(true);
    });

    it.todo(
      'prevents double stock release when two cancellations run concurrently',
    );

    it.todo('keeps stock consistent when confirmation and cancellation race');
  });
});
