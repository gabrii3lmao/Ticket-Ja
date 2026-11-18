import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { VenueModule } from 'src/venue/venue.module';
import { VenueService } from 'src/venue/venue.service';
import { resetDatabase } from './setup/database';
import {
  createBuyer,
  createCategory,
  createEvent,
  createOrder,
  createOrderItem,
  createOrganizer,
  createVenue,
} from './support/factories';
import { createIntegrationModule } from './support/test-module';

describe('VenueService (integration)', () => {
  let service: VenueService;
  let prisma: PrismaService;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const context = await createIntegrationModule([VenueModule]);
    service = context.moduleRef.get(VenueService);
    prisma = context.prisma;
    close = context.close;
  });

  afterAll(async () => {
    await close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  async function createOrganizerContext() {
    const { user, profile } = await createOrganizer(prisma);
    return { user, profile };
  }

  function owner(userId: string) {
    return { id: userId, role: 'ORGANIZER' as const };
  }

  describe('create', () => {
    it('creates a venue owned by the organizer', async () => {
      const { user, profile } = await createOrganizerContext();

      const venue = await service.create(
        {
          name: 'Main Hall',
          city: 'Sao Paulo',
          state: 'SP',
          capacity: 500,
        },
        user.id,
      );

      expect(venue).toMatchObject({
        name: 'Main Hall',
        city: 'Sao Paulo',
        state: 'SP',
        capacity: 500,
        organizerProfileId: profile.id,
      });
      await expect(
        prisma.venue.findUniqueOrThrow({ where: { id: venue.id } }),
      ).resolves.toMatchObject({ organizerProfileId: profile.id });
    });

    it('rejects a user without an organizer profile', async () => {
      const buyer = await createBuyer(prisma);

      await expect(
        service.create({ name: 'Invalid', capacity: 100 }, buyer.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an admin without an organizer profile', async () => {
      const admin = await createBuyer(prisma, { role: 'ADMIN' });

      await expect(
        service.create({ name: 'Invalid', capacity: 100 }, admin.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('filters by name, city, state and capacity range', async () => {
      const { profile } = await createOrganizerContext();
      const first = await createVenue(prisma, profile.id, {
        name: 'Alpha Hall',
        city: 'Sao Paulo',
        state: 'SP',
        capacity: 100,
      });
      await createVenue(prisma, profile.id, {
        name: 'Beta Arena',
        city: 'Rio de Janeiro',
        state: 'RJ',
        capacity: 500,
      });

      const byName = await service.findAll({ name: 'alpha' });
      expect(byName.data).toHaveLength(1);
      expect(byName.data[0].id).toBe(first.id);

      const byCity = await service.findAll({ city: 'paulo' });
      expect(byCity.data).toHaveLength(1);

      const byState = await service.findAll({ state: 'RJ' });
      expect(byState.data).toHaveLength(1);

      const byCapacity = await service.findAll({
        minCapacity: 200,
        maxCapacity: 600,
      });
      expect(byCapacity.data).toHaveLength(1);
      expect(byCapacity.data[0].capacity).toBe(500);
    });

    it('paginates the listing', async () => {
      const { profile } = await createOrganizerContext();
      for (let index = 0; index < 3; index += 1) {
        await createVenue(prisma, profile.id, { name: `Venue ${index}` });
      }

      const result = await service.findAll({
        page: 1,
        limit: 2,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(result.data).toHaveLength(2);
      expect(result.meta).toMatchObject({
        total: 3,
        page: 1,
        limit: 2,
        totalPages: 2,
      });
    });
  });

  describe('findManaged', () => {
    it('scopes organizers to their own venues', async () => {
      const first = await createOrganizerContext();
      const second = await createOrganizerContext();
      const firstVenue = await createVenue(prisma, first.profile.id);
      await createVenue(prisma, second.profile.id);

      const result = await service.findManaged({}, owner(first.user.id));

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(firstVenue.id);
      expect(result.meta.total).toBe(1);
    });

    it('lets an admin see every venue', async () => {
      const first = await createOrganizerContext();
      const second = await createOrganizerContext();
      await createVenue(prisma, first.profile.id);
      await createVenue(prisma, second.profile.id);
      const admin = await createBuyer(prisma, { role: 'ADMIN' });

      const result = await service.findManaged(
        {},
        { id: admin.id, role: 'ADMIN' },
      );

      expect(result.data).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('returns the venue with its events', async () => {
      const { profile } = await createOrganizerContext();
      const venue = await createVenue(prisma, profile.id);
      await createEvent(prisma, profile.id, venue.id);

      const result = await service.findOne(venue.id);

      expect(result).toMatchObject({ id: venue.id });
      expect(result.events).toHaveLength(1);
    });

    it('throws when the venue does not exist', async () => {
      await expect(
        service.findOne('00000000-0000-0000-0000-000000000000'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates an owned venue', async () => {
      const { user, profile } = await createOrganizerContext();
      const venue = await createVenue(prisma, profile.id, {
        capacity: 100,
      });

      await expect(
        service.update(venue.id, owner(user.id), {
          name: 'Renamed',
          city: 'Curitiba',
        }),
      ).resolves.toMatchObject({ name: 'Renamed', city: 'Curitiba' });
    });

    it('allows reducing capacity down to the allocated total', async () => {
      const { user, profile } = await createOrganizerContext();
      const venue = await createVenue(prisma, profile.id, {
        capacity: 100,
      });
      const event = await createEvent(prisma, profile.id, venue.id);
      const category = await createCategory(prisma, event.id, {
        quantity: 4,
      });
      const buyer = await createBuyer(prisma);
      const order = await createOrder(prisma, buyer.id, { status: 'PENDING' });
      await createOrderItem(prisma, order.id, category.id, { quantity: 2 });

      await expect(
        service.update(venue.id, owner(user.id), { capacity: 6 }),
      ).resolves.toMatchObject({ capacity: 6 });
    });

    it('rejects reducing capacity below the allocated total', async () => {
      const { user, profile } = await createOrganizerContext();
      const venue = await createVenue(prisma, profile.id, {
        capacity: 100,
      });
      const event = await createEvent(prisma, profile.id, venue.id);
      const category = await createCategory(prisma, event.id, {
        quantity: 4,
      });
      const buyer = await createBuyer(prisma);
      const order = await createOrder(prisma, buyer.id, { status: 'PENDING' });
      await createOrderItem(prisma, order.id, category.id, { quantity: 2 });

      await expect(
        service.update(venue.id, owner(user.id), { capacity: 5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('counts canceled order items when checking capacity', async () => {
      const { user, profile } = await createOrganizerContext();
      const venue = await createVenue(prisma, profile.id, {
        capacity: 100,
      });
      const event = await createEvent(prisma, profile.id, venue.id);
      const category = await createCategory(prisma, event.id, {
        quantity: 4,
      });
      const buyer = await createBuyer(prisma);
      const order = await createOrder(prisma, buyer.id, {
        status: 'CANCELED',
      });
      await createOrderItem(prisma, order.id, category.id, { quantity: 2 });

      // Current behavior: the venue capacity query sums every order item,
      // including canceled orders.
      await expect(
        service.update(venue.id, owner(user.id), { capacity: 5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows increasing capacity', async () => {
      const { user, profile } = await createOrganizerContext();
      const venue = await createVenue(prisma, profile.id, {
        capacity: 50,
      });

      await expect(
        service.update(venue.id, owner(user.id), { capacity: 500 }),
      ).resolves.toMatchObject({ capacity: 500 });
    });

    it('rejects an update by another organizer', async () => {
      const first = await createOrganizerContext();
      const second = await createOrganizerContext();
      const venue = await createVenue(prisma, second.profile.id);

      await expect(
        service.update(venue.id, owner(first.user.id), { name: 'Hijacked' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets an admin update any venue', async () => {
      const { profile } = await createOrganizerContext();
      const venue = await createVenue(prisma, profile.id);
      const admin = await createBuyer(prisma, { role: 'ADMIN' });

      await expect(
        service.update(
          venue.id,
          { id: admin.id, role: 'ADMIN' },
          { name: 'Admin Update' },
        ),
      ).resolves.toMatchObject({ name: 'Admin Update' });
    });

    it('throws when the venue does not exist', async () => {
      const { user } = await createOrganizerContext();

      await expect(
        service.update('00000000-0000-0000-0000-000000000000', owner(user.id), {
          name: 'Missing',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes a venue without events', async () => {
      const { user, profile } = await createOrganizerContext();
      const venue = await createVenue(prisma, profile.id);

      await service.delete(venue.id, owner(user.id));

      await expect(
        prisma.venue.findUnique({ where: { id: venue.id } }),
      ).resolves.toBeNull();
    });

    it('refuses to delete a venue with events', async () => {
      const { user, profile } = await createOrganizerContext();
      const venue = await createVenue(prisma, profile.id);
      await createEvent(prisma, profile.id, venue.id);

      await expect(
        service.delete(venue.id, owner(user.id)),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        prisma.venue.findUnique({ where: { id: venue.id } }),
      ).resolves.not.toBeNull();
    });

    it('rejects deletion by another organizer', async () => {
      const first = await createOrganizerContext();
      const second = await createOrganizerContext();
      const venue = await createVenue(prisma, second.profile.id);

      await expect(
        service.delete(venue.id, owner(first.user.id)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws when the venue does not exist', async () => {
      const { user } = await createOrganizerContext();

      await expect(
        service.delete('00000000-0000-0000-0000-000000000000', owner(user.id)),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
