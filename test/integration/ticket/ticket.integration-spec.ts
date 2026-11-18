import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { TicketModule } from 'src/ticket/ticket.module';
import { TicketService } from 'src/ticket/ticket.service';
import { EventStatus, TicketStatus } from 'generated/prisma/enums';
import { resetDatabase } from '../setup/database';
import {
  createBuyer,
  createCategory,
  createEvent,
  createOrder,
  createOrderItem,
  createOrganizer,
  createTicket,
  createVenue,
} from '../support/factories';
import { createIntegrationModule } from '../support/test-module';

describe('TicketService (integration)', () => {
  let service: TicketService;
  let prisma: PrismaService;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const context = await createIntegrationModule([TicketModule]);
    service = context.moduleRef.get(TicketService);
    prisma = context.prisma;
    close = context.close;
  });

  afterAll(async () => {
    await close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  async function createTicketContext(
    options: {
      eventStatus?: EventStatus;
      ticketStatus?: TicketStatus;
    } = {},
  ) {
    const { user: organizer, profile } = await createOrganizer(prisma);
    const venue = await createVenue(prisma, profile.id);
    const event = await createEvent(prisma, profile.id, venue.id, {
      status: options.eventStatus ?? 'PUBLISHED',
    });
    const category = await createCategory(prisma, event.id);
    const buyer = await createBuyer(prisma);
    const order = await createOrder(prisma, buyer.id, { status: 'PAID' });
    const item = await createOrderItem(prisma, order.id, category.id, {
      quantity: 1,
      unitPrice: 50,
      total: 50,
    });
    const ticket = await createTicket(
      prisma,
      {
        userId: buyer.id,
        orderItemId: item.id,
        eventId: event.id,
      },
      { status: options.ticketStatus ?? 'VALID' },
    );

    return {
      organizer,
      profile,
      venue,
      event,
      category,
      buyer,
      order,
      item,
      ticket,
    };
  }

  describe('findAll', () => {
    it('returns only the tickets of the current user', async () => {
      const first = await createTicketContext();
      const second = await createTicketContext();

      const result = await service.findAll({}, first.buyer.id);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(first.ticket.id);
      expect(result.meta.total).toBe(1);
      expect(second.ticket.userId).toBe(second.buyer.id);
    });

    it('filters by status, event, order and code', async () => {
      const context = await createTicketContext();
      const secondTicket = await createTicket(prisma, {
        userId: context.buyer.id,
        orderItemId: context.item.id,
        eventId: context.event.id,
      });
      await prisma.ticket.update({
        where: { id: secondTicket.id },
        data: { status: 'USED' },
      });

      const valid = await service.findAll(
        { status: 'VALID' },
        context.buyer.id,
      );
      expect(valid.data).toHaveLength(1);
      expect(valid.data[0].id).toBe(context.ticket.id);

      const used = await service.findAll({ status: 'USED' }, context.buyer.id);
      expect(used.data).toHaveLength(1);
      expect(used.data[0].id).toBe(secondTicket.id);

      const byEvent = await service.findAll(
        { eventId: context.event.id },
        context.buyer.id,
      );
      expect(byEvent.data).toHaveLength(2);

      const byOrder = await service.findAll(
        { orderId: context.order.id },
        context.buyer.id,
      );
      expect(byOrder.data).toHaveLength(2);

      const byCode = await service.findAll(
        { code: secondTicket.code },
        context.buyer.id,
      );
      expect(byCode.data).toHaveLength(1);
      expect(byCode.data[0].id).toBe(secondTicket.id);
    });

    it('paginates the listing', async () => {
      const context = await createTicketContext();
      for (let index = 0; index < 2; index += 1) {
        await createTicket(prisma, {
          userId: context.buyer.id,
          orderItemId: context.item.id,
          eventId: context.event.id,
        });
      }

      const result = await service.findAll(
        { page: 1, limit: 2 },
        context.buyer.id,
      );

      expect(result.data).toHaveLength(2);
      expect(result.meta).toMatchObject({
        total: 3,
        page: 1,
        limit: 2,
        totalPages: 2,
      });
    });

    it('does not list every ticket for an admin', async () => {
      await createTicketContext();
      const admin = await createBuyer(prisma, { role: 'ADMIN' });

      const result = await service.findAll({}, admin.id);

      expect(result.data).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('returns a ticket to its owner', async () => {
      const context = await createTicketContext();

      const result = await service.findOne(context.ticket.id, {
        id: context.buyer.id,
        role: 'BUYER',
      });

      expect(result).toMatchObject({ id: context.ticket.id });
      expect(result.orderItem).toMatchObject({ orderId: context.order.id });
    });

    it('returns a ticket to an admin', async () => {
      const context = await createTicketContext();
      const admin = await createBuyer(prisma, { role: 'ADMIN' });

      await expect(
        service.findOne(context.ticket.id, {
          id: admin.id,
          role: 'ADMIN',
        }),
      ).resolves.toMatchObject({ id: context.ticket.id });
    });

    it('rejects another buyer', async () => {
      const context = await createTicketContext();
      const other = await createBuyer(prisma);

      await expect(
        service.findOne(context.ticket.id, {
          id: other.id,
          role: 'BUYER',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects the organizer who owns the event but not the ticket', async () => {
      const context = await createTicketContext();

      await expect(
        service.findOne(context.ticket.id, {
          id: context.organizer.id,
          role: 'ORGANIZER',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws when the ticket does not exist', async () => {
      const buyer = await createBuyer(prisma);

      await expect(
        service.findOne('00000000-0000-0000-0000-000000000000', {
          id: buyer.id,
          role: 'BUYER',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('validate', () => {
    it('returns a safe valid response to the event organizer', async () => {
      const context = await createTicketContext();

      const result = await service.validate(context.ticket.code, {
        id: context.organizer.id,
        role: 'ORGANIZER',
      });

      expect(result.valid).toBe(true);
      expect(result.ticket).toMatchObject({
        code: context.ticket.code,
        status: 'VALID',
      });
      expect(result.ticket).not.toHaveProperty('userId');
      expect(result.event).toMatchObject({
        name: context.event.name,
        venue: {
          name: context.venue.name,
        },
      });
    });

    it('allows an admin to validate any ticket', async () => {
      const context = await createTicketContext();
      const admin = await createBuyer(prisma, { role: 'ADMIN' });

      await expect(
        service.validate(context.ticket.code, {
          id: admin.id,
          role: 'ADMIN',
        }),
      ).resolves.toMatchObject({ valid: true });
    });

    it('rejects another organizer and the ticket buyer', async () => {
      const context = await createTicketContext();
      const other = await createOrganizer(prisma);

      await expect(
        service.validate(context.ticket.code, {
          id: other.user.id,
          role: 'ORGANIZER',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await expect(
        service.validate(context.ticket.code, {
          id: context.buyer.id,
          role: 'BUYER',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it.each(['USED', 'CANCELED'] as const)(
      'marks a %s ticket as invalid',
      async (ticketStatus) => {
        const context = await createTicketContext({ ticketStatus });

        const result = await service.validate(context.ticket.code, {
          id: context.organizer.id,
          role: 'ORGANIZER',
        });

        expect(result.valid).toBe(false);
        expect(result.ticket).toMatchObject({ status: ticketStatus });
      },
    );

    it.each(['DRAFT', 'FINISHED', 'CANCELED'] as const)(
      'marks a valid ticket of a %s event as invalid',
      async (eventStatus) => {
        const context = await createTicketContext({ eventStatus });

        const result = await service.validate(context.ticket.code, {
          id: context.organizer.id,
          role: 'ORGANIZER',
        });

        expect(result.valid).toBe(false);
      },
    );

    it('throws when the code does not exist', async () => {
      const context = await createTicketContext();

      await expect(
        service.validate('UNKNOWN-CODE', {
          id: context.organizer.id,
          role: 'ORGANIZER',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('markAsUsed', () => {
    it('marks a valid ticket as used', async () => {
      const context = await createTicketContext();

      const result = await service.markAsUsed(context.ticket.id, {
        id: context.organizer.id,
        role: 'ORGANIZER',
      });

      expect(result.count).toBe(1);
      const ticket = await prisma.ticket.findUniqueOrThrow({
        where: { id: context.ticket.id },
      });
      expect(ticket.status).toBe('USED');
      expect(ticket.usedAt).toBeInstanceOf(Date);
    });

    it('allows an admin to mark any ticket as used', async () => {
      const context = await createTicketContext();
      const admin = await createBuyer(prisma, { role: 'ADMIN' });

      await expect(
        service.markAsUsed(context.ticket.id, {
          id: admin.id,
          role: 'ADMIN',
        }),
      ).resolves.toMatchObject({ count: 1 });
    });

    it('rejects a second use', async () => {
      const context = await createTicketContext();

      await service.markAsUsed(context.ticket.id, {
        id: context.organizer.id,
        role: 'ORGANIZER',
      });

      await expect(
        service.markAsUsed(context.ticket.id, {
          id: context.organizer.id,
          role: 'ORGANIZER',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it.each(['USED', 'CANCELED'] as const)(
      'rejects a %s ticket',
      async (ticketStatus) => {
        const context = await createTicketContext({ ticketStatus });

        await expect(
          service.markAsUsed(context.ticket.id, {
            id: context.organizer.id,
            role: 'ORGANIZER',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );

    it('rejects another organizer and the ticket buyer', async () => {
      const context = await createTicketContext();
      const other = await createOrganizer(prisma);

      await expect(
        service.markAsUsed(context.ticket.id, {
          id: other.user.id,
          role: 'ORGANIZER',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await expect(
        service.markAsUsed(context.ticket.id, {
          id: context.buyer.id,
          role: 'BUYER',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws when the ticket does not exist', async () => {
      const context = await createTicketContext();

      await expect(
        service.markAsUsed('00000000-0000-0000-0000-000000000000', {
          id: context.organizer.id,
          role: 'ORGANIZER',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('allows only one concurrent usage', async () => {
      const context = await createTicketContext();

      const results = await Promise.allSettled([
        service.markAsUsed(context.ticket.id, {
          id: context.organizer.id,
          role: 'ORGANIZER',
        }),
        service.markAsUsed(context.ticket.id, {
          id: context.organizer.id,
          role: 'ORGANIZER',
        }),
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

      const ticket = await prisma.ticket.findUniqueOrThrow({
        where: { id: context.ticket.id },
      });
      expect(ticket.status).toBe('USED');
      expect(ticket.usedAt).toBeInstanceOf(Date);
    });

    it.todo('rejects using a ticket from a non-published event');
  });
});
