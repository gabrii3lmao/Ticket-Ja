import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventModule } from 'src/event/event.module';
import { EventService } from 'src/event/event.service';
import { PrismaService } from 'src/prisma.service';
import { resetDatabase } from '../setup/database';
import {
  createBuyer,
  createCategory,
  createEvent,
  createOrganizer,
  createVenue,
} from '../support/factories';
import { createIntegrationModule } from '../support/test-module';

const DAY = 24 * 60 * 60 * 1000;

describe('EventService (integration)', () => {
  let service: EventService;
  let prisma: PrismaService;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const context = await createIntegrationModule([EventModule]);
    service = context.moduleRef.get(EventService);
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
    const venue = await createVenue(prisma, profile.id, { capacity: 100 });
    return { user, profile, venue };
  }

  describe('create', () => {
    it('creates an event owned by the organizer', async () => {
      const { user, profile, venue } = await createOrganizerContext();
      const startDate = new Date(Date.now() + 10 * DAY);

      const event = await service.create(
        {
          name: 'New Event',
          artists: ['Artist'],
          startDate,
          venueId: venue.id,
        },
        { id: user.id, role: 'ORGANIZER' },
      );

      expect(event).toMatchObject({
        name: 'New Event',
        venueId: venue.id,
        organizerProfileId: profile.id,
        status: 'DRAFT',
      });
      await expect(
        prisma.event.findUniqueOrThrow({ where: { id: event.id } }),
      ).resolves.toMatchObject({ organizerProfileId: profile.id });
    });

    it('rejects a buyer without an organizer profile', async () => {
      const buyer = await createBuyer(prisma);
      const { venue } = await createOrganizerContext();

      await expect(
        service.create(
          {
            name: 'Invalid',
            artists: ['Artist'],
            startDate: new Date(Date.now() + DAY),
            venueId: venue.id,
          },
          { id: buyer.id, role: 'ORGANIZER' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an admin without an organizer profile', async () => {
      const admin = await createBuyer(prisma, { role: 'ADMIN' });
      const { venue } = await createOrganizerContext();

      await expect(
        service.create(
          {
            name: 'Invalid',
            artists: ['Artist'],
            startDate: new Date(Date.now() + DAY),
            venueId: venue.id,
          },
          { id: admin.id, role: 'ADMIN' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an end date before the start date', async () => {
      const { user, venue } = await createOrganizerContext();

      await expect(
        service.create(
          {
            name: 'Invalid Dates',
            artists: ['Artist'],
            startDate: new Date(Date.now() + 2 * DAY),
            endDate: new Date(Date.now() + DAY),
            venueId: venue.id,
          },
          { id: user.id, role: 'ORGANIZER' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an unknown venue', async () => {
      const { user } = await createOrganizerContext();

      await expect(
        service.create(
          {
            name: 'Missing Venue',
            artists: ['Artist'],
            startDate: new Date(Date.now() + DAY),
            venueId: '00000000-0000-0000-0000-000000000000',
          },
          { id: user.id, role: 'ORGANIZER' },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a venue owned by another organizer', async () => {
      const first = await createOrganizerContext();
      const second = await createOrganizerContext();

      await expect(
        service.create(
          {
            name: 'Foreign Venue',
            artists: ['Artist'],
            startDate: new Date(Date.now() + DAY),
            venueId: second.venue.id,
          },
          { id: first.user.id, role: 'ORGANIZER' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('returns the event with venue and categories', async () => {
      const { profile, venue } = await createOrganizerContext();
      const event = await createEvent(prisma, profile.id, venue.id);
      await createCategory(prisma, event.id);

      const result = await service.findOne(event.id);

      expect(result).toMatchObject({ id: event.id });
      expect(result.venue).toMatchObject({ id: venue.id });
      expect(result.categories).toHaveLength(1);
    });

    it('returns a draft event by id', async () => {
      const { profile, venue } = await createOrganizerContext();
      const event = await createEvent(prisma, profile.id, venue.id, {
        status: 'DRAFT',
      });

      await expect(service.findOne(event.id)).resolves.toMatchObject({
        id: event.id,
        status: 'DRAFT',
      });
    });

    it('throws when the event does not exist', async () => {
      await expect(
        service.findOne('00000000-0000-0000-0000-000000000000'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns only published events', async () => {
      const { profile, venue } = await createOrganizerContext();
      const published = await createEvent(prisma, profile.id, venue.id, {
        name: 'Published',
        status: 'PUBLISHED',
      });
      await createEvent(prisma, profile.id, venue.id, {
        name: 'Draft',
        status: 'DRAFT',
      });
      await createEvent(prisma, profile.id, venue.id, {
        name: 'Canceled',
        status: 'CANCELED',
      });

      const result = await service.findAll({});

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(published.id);
      expect(result.meta.total).toBe(1);
    });

    it('filters by name, city, state and dates', async () => {
      const { profile } = await createOrganizerContext();
      const saoPauloVenue = await createVenue(prisma, profile.id, {
        name: 'Sao Paulo Hall',
        city: 'Sao Paulo',
        state: 'SP',
      });
      const rioVenue = await createVenue(prisma, profile.id, {
        name: 'Rio Hall',
        city: 'Rio de Janeiro',
        state: 'RJ',
      });
      const nearEvent = await createEvent(
        prisma,
        profile.id,
        saoPauloVenue.id,
        {
          name: 'Near Event',
          status: 'PUBLISHED',
          startDate: new Date(Date.now() + 5 * DAY),
          endDate: new Date(Date.now() + 6 * DAY),
        },
      );
      await createEvent(prisma, profile.id, rioVenue.id, {
        name: 'Far Event',
        status: 'PUBLISHED',
        startDate: new Date(Date.now() + 20 * DAY),
        endDate: new Date(Date.now() + 21 * DAY),
      });

      const byName = await service.findAll({ name: 'near' });
      expect(byName.data).toHaveLength(1);
      expect(byName.data[0].id).toBe(nearEvent.id);

      const byCity = await service.findAll({ city: 'sao' });
      expect(byCity.data).toHaveLength(1);
      expect(byCity.data[0].id).toBe(nearEvent.id);

      const byState = await service.findAll({ state: 'RJ' });
      expect(byState.data).toHaveLength(1);
      expect(byState.data[0].venue.state).toBe('RJ');

      const byStartDate = await service.findAll({
        startDate: new Date(Date.now() + 4 * DAY).toISOString(),
      });
      expect(byStartDate.data).toHaveLength(2);

      const byEndDate = await service.findAll({
        endDate: new Date(Date.now() + 7 * DAY).toISOString(),
      });
      expect(byEndDate.data).toHaveLength(1);
      expect(byEndDate.data[0].id).toBe(nearEvent.id);
    });

    it('paginates the public listing', async () => {
      const { profile, venue } = await createOrganizerContext();
      for (let index = 0; index < 3; index += 1) {
        await createEvent(prisma, profile.id, venue.id, {
          name: `Event ${index}`,
          status: 'PUBLISHED',
          startDate: new Date(Date.now() + (index + 1) * DAY),
        });
      }

      const result = await service.findAll({
        page: 1,
        limit: 2,
        sortBy: 'startDate',
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
    it('scopes organizers to their own events', async () => {
      const first = await createOrganizerContext();
      const second = await createOrganizerContext();
      const firstEvent = await createEvent(
        prisma,
        first.profile.id,
        first.venue.id,
      );
      await createEvent(prisma, second.profile.id, second.venue.id);

      const result = await service.findManaged(
        {},
        { id: first.user.id, role: 'ORGANIZER' },
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(firstEvent.id);
      expect(result.meta.total).toBe(1);
    });

    it('lets an admin see every event and filter by status and name', async () => {
      const first = await createOrganizerContext();
      const second = await createOrganizerContext();
      const draft = await createEvent(
        prisma,
        first.profile.id,
        first.venue.id,
        {
          name: 'Draft Alpha',
          status: 'DRAFT',
        },
      );
      await createEvent(prisma, second.profile.id, second.venue.id, {
        name: 'Published Beta',
        status: 'PUBLISHED',
      });
      const admin = await createBuyer(prisma, { role: 'ADMIN' });

      const all = await service.findManaged(
        {},
        { id: admin.id, role: 'ADMIN' },
      );
      expect(all.data).toHaveLength(2);

      const filtered = await service.findManaged(
        { status: 'DRAFT', name: 'alpha' },
        { id: admin.id, role: 'ADMIN' },
      );
      expect(filtered.data).toHaveLength(1);
      expect(filtered.data[0].id).toBe(draft.id);
    });
  });

  describe('update', () => {
    it('updates an owned event', async () => {
      const { user, profile, venue } = await createOrganizerContext();
      const event = await createEvent(prisma, profile.id, venue.id);

      const updated = await service.update(
        event.id,
        { id: user.id, role: 'ORGANIZER' },
        { name: 'Updated Event' },
      );

      expect(updated).toMatchObject({ id: event.id, name: 'Updated Event' });
    });

    it('validates end date against the new start date', async () => {
      const { user, profile, venue } = await createOrganizerContext();
      const event = await createEvent(prisma, profile.id, venue.id, {
        startDate: new Date(Date.now() + 5 * DAY),
      });

      await expect(
        service.update(
          event.id,
          { id: user.id, role: 'ORGANIZER' },
          {
            startDate: new Date(Date.now() + 10 * DAY),
            endDate: new Date(Date.now() + 9 * DAY),
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it.todo(
      'rejects a start date that moves past the existing end date when endDate is omitted',
    );

    it('rejects a venue owned by another organizer', async () => {
      const first = await createOrganizerContext();
      const second = await createOrganizerContext();
      const event = await createEvent(prisma, first.profile.id, first.venue.id);

      await expect(
        service.update(
          event.id,
          { id: first.user.id, role: 'ORGANIZER' },
          { venueId: second.venue.id },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an event owned by another organizer', async () => {
      const first = await createOrganizerContext();
      const second = await createOrganizerContext();
      const event = await createEvent(
        prisma,
        second.profile.id,
        second.venue.id,
      );

      await expect(
        service.update(
          event.id,
          { id: first.user.id, role: 'ORGANIZER' },
          { name: 'Hijacked' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets an admin update any event', async () => {
      const { profile, venue } = await createOrganizerContext();
      const event = await createEvent(prisma, profile.id, venue.id);
      const admin = await createBuyer(prisma, { role: 'ADMIN' });

      await expect(
        service.update(
          event.id,
          { id: admin.id, role: 'ADMIN' },
          { name: 'Admin Update' },
        ),
      ).resolves.toMatchObject({ name: 'Admin Update' });
    });

    it('throws when the event does not exist', async () => {
      const { user } = await createOrganizerContext();

      await expect(
        service.update(
          '00000000-0000-0000-0000-000000000000',
          { id: user.id, role: 'ORGANIZER' },
          { name: 'Missing' },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes an event without categories', async () => {
      const { user, profile, venue } = await createOrganizerContext();
      const event = await createEvent(prisma, profile.id, venue.id);

      await service.delete(event.id, { id: user.id, role: 'ORGANIZER' });

      await expect(
        prisma.event.findUnique({ where: { id: event.id } }),
      ).resolves.toBeNull();
    });

    it('refuses to delete an event with categories', async () => {
      const { user, profile, venue } = await createOrganizerContext();
      const event = await createEvent(prisma, profile.id, venue.id);
      await createCategory(prisma, event.id);

      await expect(
        service.delete(event.id, { id: user.id, role: 'ORGANIZER' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        prisma.event.findUnique({ where: { id: event.id } }),
      ).resolves.not.toBeNull();
    });

    it('rejects deletion by another organizer', async () => {
      const first = await createOrganizerContext();
      const second = await createOrganizerContext();
      const event = await createEvent(
        prisma,
        second.profile.id,
        second.venue.id,
      );

      await expect(
        service.delete(event.id, { id: first.user.id, role: 'ORGANIZER' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('updateStatus', () => {
    it('publishes a draft event that has a category', async () => {
      const { user, profile, venue } = await createOrganizerContext();
      const event = await createEvent(prisma, profile.id, venue.id, {
        status: 'DRAFT',
      });
      await createCategory(prisma, event.id);

      const result = await service.updateStatus(
        event.id,
        { id: user.id, role: 'ORGANIZER' },
        'PUBLISHED',
      );

      expect(result.status).toBe('PUBLISHED');
      await expect(
        prisma.event.findUniqueOrThrow({ where: { id: event.id } }),
      ).resolves.toMatchObject({ status: 'PUBLISHED' });
    });

    it('refuses to publish an event without categories', async () => {
      const { user, profile, venue } = await createOrganizerContext();
      const event = await createEvent(prisma, profile.id, venue.id, {
        status: 'DRAFT',
      });

      await expect(
        service.updateStatus(
          event.id,
          { id: user.id, role: 'ORGANIZER' },
          'PUBLISHED',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        prisma.event.findUniqueOrThrow({ where: { id: event.id } }),
      ).resolves.toMatchObject({ status: 'DRAFT' });
    });

    it.each([
      ['DRAFT', 'FINISHED'],
      ['PUBLISHED', 'DRAFT'],
      ['CANCELED', 'PUBLISHED'],
      ['CANCELED', 'DRAFT'],
    ] as const)('rejects the transition %s -> %s', async (from, to) => {
      const { user, profile, venue } = await createOrganizerContext();
      const event = await createEvent(prisma, profile.id, venue.id, {
        status: from,
      });
      if (from === 'DRAFT' || to === 'DRAFT') {
        await createCategory(prisma, event.id);
      }

      await expect(
        service.updateStatus(event.id, { id: user.id, role: 'ORGANIZER' }, to),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        prisma.event.findUniqueOrThrow({ where: { id: event.id } }),
      ).resolves.toMatchObject({ status: from });
    });

    it.each([
      ['DRAFT', 'CANCELED'],
      ['PUBLISHED', 'FINISHED'],
      ['PUBLISHED', 'CANCELED'],
      ['FINISHED', 'CANCELED'],
    ] as const)('allows the transition %s -> %s', async (from, to) => {
      const { user, profile, venue } = await createOrganizerContext();
      const event = await createEvent(prisma, profile.id, venue.id, {
        status: from,
      });

      await expect(
        service.updateStatus(event.id, { id: user.id, role: 'ORGANIZER' }, to),
      ).resolves.toMatchObject({ status: to });
    });

    it('rejects a status change by another organizer', async () => {
      const first = await createOrganizerContext();
      const second = await createOrganizerContext();
      const event = await createEvent(
        prisma,
        second.profile.id,
        second.venue.id,
        { status: 'PUBLISHED' },
      );

      await expect(
        service.updateStatus(
          event.id,
          { id: first.user.id, role: 'ORGANIZER' },
          'FINISHED',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets an admin change the status of any event', async () => {
      const { profile, venue } = await createOrganizerContext();
      const event = await createEvent(prisma, profile.id, venue.id, {
        status: 'PUBLISHED',
      });
      const admin = await createBuyer(prisma, { role: 'ADMIN' });

      await expect(
        service.updateStatus(
          event.id,
          { id: admin.id, role: 'ADMIN' },
          'FINISHED',
        ),
      ).resolves.toMatchObject({ status: 'FINISHED' });
    });
  });
});
