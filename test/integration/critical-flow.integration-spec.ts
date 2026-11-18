import { BadRequestException } from '@nestjs/common';
import { AdminModule } from 'src/admin/admin.module';
import { AdminService } from 'src/admin/admin.service';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { CategoryModule } from 'src/category/category.module';
import { CategoryService } from 'src/category/category.service';
import { CouponModule } from 'src/coupon/coupon.module';
import { CouponService } from 'src/coupon/coupon.service';
import { EventModule } from 'src/event/event.module';
import { EventService } from 'src/event/event.service';
import { OrderModule } from 'src/order/order.module';
import { OrderExpirationService } from 'src/order/order-expiration/order-expiration.service';
import { OrderService } from 'src/order/order.service';
import { PrismaService } from 'src/prisma.service';
import { TicketModule } from 'src/ticket/ticket.module';
import { TicketService } from 'src/ticket/ticket.service';
import { VenueModule } from 'src/venue/venue.module';
import { VenueService } from 'src/venue/venue.service';
import { resetDatabase } from './setup/database';
import {
  TEST_PASSWORD,
  createBuyer,
  createCategory,
  createCoupon,
  createEvent,
  createOrganizer,
  createVenue,
  randomDocument,
} from './support/factories';
import { createIntegrationModule } from './support/test-module';

const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

describe('Critical ticket sales flow (integration)', () => {
  let authService: AuthService;
  let adminService: AdminService;
  let venueService: VenueService;
  let eventService: EventService;
  let categoryService: CategoryService;
  let couponService: CouponService;
  let orderService: OrderService;
  let expirationService: OrderExpirationService;
  let ticketService: TicketService;
  let prisma: PrismaService;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const context = await createIntegrationModule([
      AuthModule,
      AdminModule,
      VenueModule,
      EventModule,
      CategoryModule,
      CouponModule,
      OrderModule,
      TicketModule,
    ]);
    authService = context.moduleRef.get(AuthService);
    adminService = context.moduleRef.get(AdminService);
    venueService = context.moduleRef.get(VenueService);
    eventService = context.moduleRef.get(EventService);
    categoryService = context.moduleRef.get(CategoryService);
    couponService = context.moduleRef.get(CouponService);
    orderService = context.moduleRef.get(OrderService);
    expirationService = context.moduleRef.get(OrderExpirationService);
    ticketService = context.moduleRef.get(TicketService);
    prisma = context.prisma;
    close = context.close;
  });

  afterAll(async () => {
    await close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  function organizerPayload(userId: string) {
    return { id: userId, role: 'ORGANIZER' as const };
  }

  async function createPublishedEvent() {
    const { user: organizer, profile } = await createOrganizer(prisma);
    const venue = await createVenue(prisma, profile.id, { capacity: 100 });
    const event = await createEvent(prisma, profile.id, venue.id, {
      status: 'PUBLISHED',
      startDate: new Date(Date.now() + 10 * DAY),
    });
    const category = await createCategory(prisma, event.id, {
      price: 50,
      quantity: 5,
    });

    return { organizer, profile, venue, event, category };
  }

  it('onboards an organizer and sells a ticket end to end', async () => {
    // 1. An organizer applicant registers and waits for approval.
    const registration = await authService.register({
      name: 'Flow Organizer',
      email: 'flow.organizer@example.com',
      password: TEST_PASSWORD,
      role: 'ORGANIZER',
      organizer: {
        legalName: 'Flow Events LTDA',
        tradeName: 'Flow Events',
        document: randomDocument(),
      },
    });
    expect(registration.user.role).toBe('BUYER');

    const application = await prisma.organizerAplication.findUniqueOrThrow({
      where: { userId: registration.user.id },
    });
    expect(application.status).toBe('PENDING');

    // 2. An admin approves the application, which promotes the user.
    const pending = await adminService.listOrganizerApplications({
      status: 'PENDING',
    });
    expect(pending.data.map((item) => item.id)).toContain(application.id);
    const profile = await adminService.approveOrganizerApplication(
      application.id,
    );
    await expect(
      prisma.user.findUniqueOrThrow({ where: { id: registration.user.id } }),
    ).resolves.toMatchObject({ role: 'ORGANIZER' });

    // 3. The organizer creates the venue, event, category and coupon.
    const venue = await venueService.create(
      {
        name: 'Flow Arena',
        city: 'Sao Paulo',
        state: 'SP',
        capacity: 100,
      },
      registration.user.id,
    );
    const event = await eventService.create(
      {
        name: 'Flow Festival',
        artists: ['Main Act'],
        startDate: new Date(Date.now() + 10 * DAY),
        venueId: venue.id,
      },
      organizerPayload(registration.user.id),
    );
    const category = await categoryService.create(
      { name: 'General Admission', price: 50, quantity: 10 },
      event.id,
      organizerPayload(registration.user.id),
    );
    const coupon = await couponService.create(
      event.id,
      organizerPayload(registration.user.id),
      {
        code: ' flow10 ',
        description: 'Flow discount',
        discountType: 'FIXED',
        value: 10,
        maxUses: 5,
      },
    );
    expect(coupon.code).toBe('FLOW10');

    await eventService.updateStatus(
      event.id,
      organizerPayload(registration.user.id),
      'PUBLISHED',
    );

    // 4. A buyer registers and purchases two tickets with the coupon.
    const buyerRegistration = await authService.register({
      name: 'Flow Buyer',
      email: 'flow.buyer@example.com',
      password: TEST_PASSWORD,
      role: 'BUYER',
    });
    const { order, payment } = await orderService.create(
      {
        items: [{ categoryId: category.id, quantity: 2 }],
        couponCode: 'flow10',
      },
      buyerRegistration.user.id,
      'flow-checkout',
    );

    expect(Number(order.subtotal)).toBe(100);
    expect(Number(order.discount)).toBe(10);
    expect(Number(order.total)).toBe(95);
    expect(order.orderItems[0].tickets).toHaveLength(2);
    await expect(
      prisma.category.findUniqueOrThrow({ where: { id: category.id } }),
    ).resolves.toMatchObject({ quantity: 8 });
    await expect(
      prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } }),
    ).resolves.toMatchObject({ currentUses: 1 });
    await expect(
      prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
    ).resolves.toMatchObject({ status: 'PENDING' });

    // 5. An admin confirms the payment and the order becomes usable.
    await adminService.confirmPayment(order.id);
    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({ status: 'PAID' });
    await expect(
      prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
    ).resolves.toMatchObject({ status: 'APPROVED' });

    // 6. The organizer validates and uses one of the tickets.
    const firstTicket = order.orderItems[0].tickets[0];
    const validation = await ticketService.validate(
      firstTicket.code,
      organizerPayload(registration.user.id),
    );
    expect(validation.valid).toBe(true);
    expect(validation.ticket).toMatchObject({ code: firstTicket.code });

    await ticketService.markAsUsed(
      firstTicket.id,
      organizerPayload(registration.user.id),
    );
    const storedTicket = await prisma.ticket.findUniqueOrThrow({
      where: { id: firstTicket.id },
    });
    expect(storedTicket.status).toBe('USED');
    expect(storedTicket.usedAt).toBeInstanceOf(Date);

    await expect(
      ticketService.markAsUsed(
        firstTicket.id,
        organizerPayload(registration.user.id),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    // The unused ticket is still valid and belongs to the paid order.
    const unusedTicket = order.orderItems[0].tickets[1];
    await expect(
      ticketService.validate(
        unusedTicket.code,
        organizerPayload(registration.user.id),
      ),
    ).resolves.toMatchObject({ valid: true });
  });

  it('cancels a rejected payment and releases the reservation', async () => {
    const setup = await createPublishedEvent();
    const coupon = await createCoupon(prisma, setup.event.id, {
      code: 'CANCEL10',
      discountType: 'FIXED',
      value: 10,
      maxUses: 5,
    });
    const buyer = await createBuyer(prisma);

    const { order } = await orderService.create(
      {
        items: [{ categoryId: setup.category.id, quantity: 2 }],
        couponCode: 'CANCEL10',
      },
      buyer.id,
    );

    await adminService.rejectPayment(order.id, 'Payment declined');

    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({ status: 'CANCELED' });
    await expect(
      prisma.category.findUniqueOrThrow({ where: { id: setup.category.id } }),
    ).resolves.toMatchObject({ quantity: 5 });

    const payment = await prisma.payment.findFirstOrThrow({
      where: { orderId: order.id },
    });
    expect(payment.status).toBe('REJECTED');
    expect(payment.rejectReason).toBe('Payment declined');

    const tickets = await prisma.ticket.findMany({
      where: { orderItem: { orderId: order.id } },
    });
    expect(tickets).toHaveLength(2);
    expect(tickets.every((ticket) => ticket.status === 'CANCELED')).toBe(true);

    // The ticket cannot be validated or used after the cancellation.
    const firstTicket = order.orderItems[0].tickets[0];
    await expect(
      ticketService.validate(
        firstTicket.code,
        organizerPayload(setup.organizer.id),
      ),
    ).resolves.toMatchObject({ valid: false });
    await expect(
      ticketService.markAsUsed(
        firstTicket.id,
        organizerPayload(setup.organizer.id),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    // Known gap: the coupon usage consumed at checkout is not restored.
    await expect(
      prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } }),
    ).resolves.toMatchObject({ currentUses: 1 });
  });

  it('expires an unpaid reservation and releases its tickets', async () => {
    const setup = await createPublishedEvent();
    const buyer = await createBuyer(prisma);

    const { order } = await orderService.create(
      { items: [{ categoryId: setup.category.id, quantity: 3 }] },
      buyer.id,
    );
    await prisma.order.update({
      where: { id: order.id },
      data: { reservedUntil: new Date(Date.now() - MINUTE) },
    });

    await expect(expirationService.expirePendingReservations()).resolves.toBe(
      1,
    );

    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({ status: 'CANCELED' });
    await expect(
      prisma.category.findUniqueOrThrow({ where: { id: setup.category.id } }),
    ).resolves.toMatchObject({ quantity: 5 });

    const payment = await prisma.payment.findFirstOrThrow({
      where: { orderId: order.id },
    });
    expect(payment.status).toBe('REJECTED');
    expect(payment.rejectReason).toBe('Reservation TTL expired');

    const tickets = await prisma.ticket.findMany({
      where: { orderItem: { orderId: order.id } },
    });
    expect(tickets).toHaveLength(3);
    expect(tickets.every((ticket) => ticket.status === 'CANCELED')).toBe(true);
  });
});
