import { randomBytes, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma.service';

export const TEST_PASSWORD = 'Password123!';
const TEST_PASSWORD_ROUNDS = 4;

type UserOverrides = Partial<Prisma.UserUncheckedCreateInput>;
type OrganizerProfileOverrides = Partial<
  Omit<Prisma.OrganizerProfileUncheckedCreateInput, 'userId'>
>;
type OrganizerApplicationOverrides = Partial<
  Omit<Prisma.OrganizerAplicationUncheckedCreateInput, 'userId'>
>;
type VenueOverrides = Partial<
  Omit<Prisma.VenueUncheckedCreateInput, 'organizerProfileId'>
>;
type EventOverrides = Partial<
  Omit<Prisma.EventUncheckedCreateInput, 'organizerProfileId' | 'venueId'>
>;
type CategoryOverrides = Partial<
  Omit<Prisma.CategoryUncheckedCreateInput, 'eventId'>
>;
type CouponOverrides = Partial<
  Omit<Prisma.CouponUncheckedCreateInput, 'eventId'>
>;
type OrderOverrides = Partial<Omit<Prisma.OrderUncheckedCreateInput, 'userId'>>;
type OrderItemOverrides = Partial<
  Omit<Prisma.OrderItemUncheckedCreateInput, 'orderId' | 'categoryId'>
>;
type PaymentOverrides = Partial<
  Omit<Prisma.PaymentUncheckedCreateInput, 'orderId'>
>;
type TicketOverrides = Partial<
  Omit<Prisma.TicketUncheckedCreateInput, 'userId' | 'orderItemId' | 'eventId'>
>;

const DAY = 24 * 60 * 60 * 1000;

export async function createBuyer(
  prisma: PrismaService,
  overrides: UserOverrides = {},
) {
  return prisma.user.create({
    data: {
      name: 'Test Buyer',
      email: `buyer-${randomUUID()}@example.com`,
      passwordHash: await bcrypt.hash(TEST_PASSWORD, TEST_PASSWORD_ROUNDS),
      ...overrides,
    },
  });
}

export async function createOrganizer(
  prisma: PrismaService,
  overrides: UserOverrides = {},
  profileOverrides: OrganizerProfileOverrides = {},
) {
  const user = await createBuyer(prisma, {
    role: 'ORGANIZER',
    ...overrides,
  });

  const profile = await prisma.organizerProfile.create({
    data: {
      userId: user.id,
      legalName: 'Test Organizer',
      document: randomDocument(),
      ...profileOverrides,
    },
  });

  return { user, profile };
}

export async function createOrganizerApplication(
  prisma: PrismaService,
  userId: string,
  overrides: OrganizerApplicationOverrides = {},
) {
  return prisma.organizerAplication.create({
    data: {
      userId,
      legalName: 'Test Organizer Application',
      document: randomDocument(),
      status: 'PENDING',
      ...overrides,
    },
  });
}

export async function createVenue(
  prisma: PrismaService,
  organizerProfileId: string,
  overrides: VenueOverrides = {},
) {
  return prisma.venue.create({
    data: {
      name: 'Test Venue',
      capacity: 100,
      organizerProfileId,
      ...overrides,
    },
  });
}

export async function createEvent(
  prisma: PrismaService,
  organizerProfileId: string,
  venueId: string,
  overrides: EventOverrides = {},
) {
  return prisma.event.create({
    data: {
      name: 'Test Event',
      artists: ['Test Artist'],
      startDate: new Date(Date.now() + 7 * DAY),
      status: 'DRAFT',
      organizerProfileId,
      venueId,
      ...overrides,
    },
  });
}

export async function createCategory(
  prisma: PrismaService,
  eventId: string,
  overrides: CategoryOverrides = {},
) {
  return prisma.category.create({
    data: {
      name: 'Test Category',
      price: 50,
      quantity: 10,
      eventId,
      ...overrides,
    },
  });
}

export async function createCoupon(
  prisma: PrismaService,
  eventId: string | null,
  overrides: CouponOverrides = {},
) {
  return prisma.coupon.create({
    data: {
      code: `COUPON-${randomUUID()}`.toUpperCase(),
      description: 'Test Coupon',
      discountType: 'FIXED',
      value: 10,
      eventId,
      ...overrides,
    },
  });
}

export async function createOrder(
  prisma: PrismaService,
  userId: string,
  overrides: OrderOverrides = {},
) {
  return prisma.order.create({
    data: {
      userId,
      subtotal: 100,
      total: 105,
      ...overrides,
    },
  });
}

export async function createOrderItem(
  prisma: PrismaService,
  orderId: string,
  categoryId: string,
  overrides: OrderItemOverrides = {},
) {
  return prisma.orderItem.create({
    data: {
      orderId,
      categoryId,
      quantity: 1,
      unitPrice: 50,
      total: 50,
      ...overrides,
    },
  });
}

export async function createPayment(
  prisma: PrismaService,
  orderId: string,
  overrides: PaymentOverrides = {},
) {
  return prisma.payment.create({
    data: {
      orderId,
      amount: 105,
      ...overrides,
    },
  });
}

export async function createTicket(
  prisma: PrismaService,
  relations: { userId: string; orderItemId: string; eventId: string },
  overrides: TicketOverrides = {},
) {
  const code = `TKT-${randomBytes(12).toString('base64url')}`;

  return prisma.ticket.create({
    data: {
      ...relations,
      code,
      qrCode: `http://localhost:3000/api/ticket/validate/${code}`,
      ...overrides,
    },
  });
}

export function randomDocument(): string {
  return randomBytes(7).toString('hex');
}
