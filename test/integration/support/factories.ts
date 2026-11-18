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
type VenueOverrides = Partial<
  Omit<Prisma.VenueUncheckedCreateInput, 'organizerProfileId'>
>;
type EventOverrides = Partial<
  Omit<Prisma.EventUncheckedCreateInput, 'organizerProfileId' | 'venueId'>
>;
type OrderOverrides = Partial<Omit<Prisma.OrderUncheckedCreateInput, 'userId'>>;

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
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'DRAFT',
      organizerProfileId,
      venueId,
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

export function randomDocument(): string {
  return randomBytes(7).toString('hex');
}
