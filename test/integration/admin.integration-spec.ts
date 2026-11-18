import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminModule } from 'src/admin/admin.module';
import { AdminService } from 'src/admin/admin.service';
import { PrismaService } from 'src/prisma.service';
import { resetDatabase } from './setup/database';
import {
  createBuyer,
  createCategory,
  createEvent,
  createOrder,
  createOrderItem,
  createOrganizer,
  createOrganizerApplication,
  createPayment,
  createTicket,
  createVenue,
  randomDocument,
} from './support/factories';
import { createIntegrationModule } from './support/test-module';

describe('AdminService (integration)', () => {
  let service: AdminService;
  let prisma: PrismaService;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const context = await createIntegrationModule([AdminModule]);
    service = context.moduleRef.get(AdminService);
    prisma = context.prisma;
    close = context.close;
  });

  afterAll(async () => {
    await close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  describe('listOrganizerApplications', () => {
    it('filters by status, legal name and trade name', async () => {
      const first = await createBuyer(prisma);
      const second = await createBuyer(prisma);
      const third = await createBuyer(prisma);
      await createOrganizerApplication(prisma, first.id, {
        legalName: 'Alpha Events LTDA',
        tradeName: 'Alpha',
      });
      await createOrganizerApplication(prisma, second.id, {
        legalName: 'Beta Events LTDA',
        tradeName: 'Beta',
        status: 'REJECTED',
      });
      await createOrganizerApplication(prisma, third.id, {
        legalName: 'Gamma Productions',
        tradeName: 'Gamma',
      });

      const pending = await service.listOrganizerApplications({
        status: 'PENDING',
      });
      expect(pending.data).toHaveLength(2);
      expect(pending.meta).toMatchObject({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const byLegalName = await service.listOrganizerApplications({
        legalName: 'alpha',
      });
      expect(byLegalName.data).toHaveLength(1);
      expect(byLegalName.data[0].legalName).toBe('Alpha Events LTDA');

      const byTradeName = await service.listOrganizerApplications({
        tradeName: 'BET',
      });
      expect(byTradeName.data).toHaveLength(1);
      expect(byTradeName.data[0].tradeName).toBe('Beta');
    });

    it('filters by document and paginates', async () => {
      const users = await Promise.all([
        createBuyer(prisma),
        createBuyer(prisma),
        createBuyer(prisma),
      ]);
      const documents = [randomDocument(), randomDocument(), randomDocument()];
      for (let index = 0; index < users.length; index += 1) {
        await createOrganizerApplication(prisma, users[index].id, {
          document: documents[index],
          legalName: `Application ${index}`,
        });
      }

      const firstPage = await service.listOrganizerApplications({
        page: 1,
        limit: 2,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });
      expect(firstPage.data).toHaveLength(2);
      expect(firstPage.meta).toMatchObject({
        total: 3,
        page: 1,
        limit: 2,
        totalPages: 2,
      });

      const secondPage = await service.listOrganizerApplications({
        page: 2,
        limit: 2,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });
      expect(secondPage.data).toHaveLength(1);

      const byDocument = await service.listOrganizerApplications({
        document: documents[1],
      });
      expect(byDocument.data).toHaveLength(1);
      expect(byDocument.data[0].document).toBe(documents[1]);
    });
  });

  describe('getOrganizerApplicationById', () => {
    it('returns the application with the applicant data', async () => {
      const user = await createBuyer(prisma);
      const application = await createOrganizerApplication(prisma, user.id);

      const result = await service.getOrganizerApplicationById(application.id);

      expect(result).toMatchObject({ id: application.id });
      expect(result.user).toMatchObject({
        id: user.id,
        email: user.email,
        name: user.name,
      });
    });

    it('throws when the application does not exist', async () => {
      await expect(
        service.getOrganizerApplicationById(
          '00000000-0000-0000-0000-000000000000',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('approveOrganizerApplication', () => {
    it('creates the organizer profile, promotes the user and removes the application', async () => {
      const user = await createBuyer(prisma);
      const application = await createOrganizerApplication(prisma, user.id, {
        legalName: 'Approved Events LTDA',
        tradeName: 'Approved',
        document: randomDocument(),
      });

      const profile = await service.approveOrganizerApplication(application.id);

      expect(profile).toMatchObject({
        userId: user.id,
        legalName: 'Approved Events LTDA',
        tradeName: 'Approved',
        document: application.document,
      });
      await expect(
        prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      ).resolves.toMatchObject({ role: 'ORGANIZER' });
      await expect(
        prisma.organizerAplication.findUnique({
          where: { id: application.id },
        }),
      ).resolves.toBeNull();
      await expect(
        prisma.organizerProfile.count({ where: { userId: user.id } }),
      ).resolves.toBe(1);
    });

    it('rejects a non-pending application without changing the user', async () => {
      const user = await createBuyer(prisma);
      const application = await createOrganizerApplication(prisma, user.id, {
        status: 'REJECTED',
        rejectedReason: 'Invalid document',
      });

      await expect(
        service.approveOrganizerApplication(application.id),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      ).resolves.toMatchObject({ role: 'BUYER' });
      await expect(
        prisma.organizerProfile.count({ where: { userId: user.id } }),
      ).resolves.toBe(0);
    });

    it('throws when the application does not exist', async () => {
      await expect(
        service.approveOrganizerApplication(
          '00000000-0000-0000-0000-000000000000',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('keeps a single profile when two approvals run concurrently', async () => {
      const user = await createBuyer(prisma);
      const application = await createOrganizerApplication(prisma, user.id);

      const results = await Promise.allSettled([
        service.approveOrganizerApplication(application.id),
        service.approveOrganizerApplication(application.id),
      ]);

      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === 'rejected'),
      ).toHaveLength(1);
      await expect(
        prisma.organizerProfile.count({ where: { userId: user.id } }),
      ).resolves.toBe(1);
      await expect(
        prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      ).resolves.toMatchObject({ role: 'ORGANIZER' });
      await expect(
        prisma.organizerAplication.findUnique({
          where: { id: application.id },
        }),
      ).resolves.toBeNull();
    });
  });

  describe('rejectOrganizerApplication', () => {
    it('rejects a pending application with a reason', async () => {
      const user = await createBuyer(prisma);
      const application = await createOrganizerApplication(prisma, user.id);

      const rejected = await service.rejectOrganizerApplication(
        application.id,
        { rejectReason: 'Invalid document' },
      );

      expect(rejected).toMatchObject({
        id: application.id,
        status: 'REJECTED',
        rejectedReason: 'Invalid document',
      });
      await expect(
        prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      ).resolves.toMatchObject({ role: 'BUYER' });
    });

    it('rejects a non-pending application', async () => {
      const user = await createBuyer(prisma);
      const application = await createOrganizerApplication(prisma, user.id, {
        status: 'APPROVED',
      });

      await expect(
        service.rejectOrganizerApplication(application.id, {
          rejectReason: 'Too late',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when the application does not exist', async () => {
      await expect(
        service.rejectOrganizerApplication(
          '00000000-0000-0000-0000-000000000000',
          { rejectReason: 'Missing' },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listOrders', () => {
    it('defaults to pending orders and filters by status', async () => {
      const buyer = await createBuyer(prisma);
      const pending = await createOrder(prisma, buyer.id, {
        status: 'PENDING',
      });
      await createOrder(prisma, buyer.id, { status: 'PAID' });
      await createOrder(prisma, buyer.id, { status: 'CANCELED' });

      const defaultResult = await service.listOrders({});
      expect(defaultResult.data).toHaveLength(1);
      expect(defaultResult.data[0].id).toBe(pending.id);

      const paid = await service.listOrders({ status: 'PAID' });
      expect(paid.data).toHaveLength(1);
      expect(paid.data[0].status).toBe('PAID');
    });

    it('paginates and sorts orders', async () => {
      const buyer = await createBuyer(prisma);
      for (let index = 0; index < 3; index += 1) {
        await createOrder(prisma, buyer.id, {
          status: 'PENDING',
          subtotal: 100 + index,
          total: 105 + index,
        });
      }

      const result = await service.listOrders({
        page: 1,
        limit: 2,
        sortBy: 'subtotal',
        sortOrder: 'asc',
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].subtotal.toNumber()).toBe(100);
      expect(result.data[1].subtotal.toNumber()).toBe(101);
      expect(result.meta).toMatchObject({
        total: 3,
        page: 1,
        limit: 2,
        totalPages: 2,
      });
    });
  });

  describe('getOrderDetail', () => {
    it('returns items, payment and buyer data', async () => {
      const { profile } = await createOrganizer(prisma);
      const venue = await createVenue(prisma, profile.id);
      const event = await createEvent(prisma, profile.id, venue.id, {
        status: 'PUBLISHED',
      });
      const category = await createCategory(prisma, event.id);
      const buyer = await createBuyer(prisma);
      const order = await createOrder(prisma, buyer.id);
      await createOrderItem(prisma, order.id, category.id);
      await createPayment(prisma, order.id);

      const result = await service.getOrderDetail(order.id);

      expect(result).toMatchObject({ id: order.id, userId: buyer.id });
      expect(result!.orderItems).toHaveLength(1);
      expect(result!.payment).not.toBeNull();
      expect(result!.user).toMatchObject({
        id: buyer.id,
        email: buyer.email,
        name: buyer.name,
      });
    });

    it('returns null for an unknown order', async () => {
      await expect(
        service.getOrderDetail('00000000-0000-0000-0000-000000000000'),
      ).resolves.toBeNull();
    });
  });

  describe('confirmPayment', () => {
    it('marks the order as paid', async () => {
      const buyer = await createBuyer(prisma);
      const order = await createOrder(prisma, buyer.id, {
        status: 'PENDING',
      });
      const payment = await createPayment(prisma, order.id);

      await service.confirmPayment(order.id);

      await expect(
        prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
      ).resolves.toMatchObject({ status: 'PAID' });
      await expect(
        prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
      ).resolves.toMatchObject({ status: 'APPROVED' });
    });

    it('does not change an already paid order', async () => {
      const buyer = await createBuyer(prisma);
      const order = await createOrder(prisma, buyer.id, { status: 'PAID' });
      const payment = await createPayment(prisma, order.id, {
        status: 'APPROVED',
      });

      await service.confirmPayment(order.id);

      await expect(
        prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
      ).resolves.toMatchObject({ status: 'APPROVED' });
    });

    it('throws when the order has no payment', async () => {
      const buyer = await createBuyer(prisma);
      const order = await createOrder(prisma, buyer.id);

      await expect(service.confirmPayment(order.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('rejectPayment', () => {
    it('cancels the order, rejects the payment and releases stock', async () => {
      const { profile } = await createOrganizer(prisma);
      const venue = await createVenue(prisma, profile.id);
      const event = await createEvent(prisma, profile.id, venue.id, {
        status: 'PUBLISHED',
      });
      const category = await createCategory(prisma, event.id, {
        quantity: 5,
      });
      const buyer = await createBuyer(prisma);
      const order = await createOrder(prisma, buyer.id);
      const item = await createOrderItem(prisma, order.id, category.id, {
        quantity: 2,
        unitPrice: 50,
        total: 100,
      });
      await createTicket(prisma, {
        userId: buyer.id,
        orderItemId: item.id,
        eventId: event.id,
      });
      const payment = await createPayment(prisma, order.id);

      await service.rejectPayment(order.id, 'Payment declined');

      await expect(
        prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
      ).resolves.toMatchObject({ status: 'CANCELED' });
      await expect(
        prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
      ).resolves.toMatchObject({
        status: 'REJECTED',
        rejectReason: 'Payment declined',
      });
      await expect(
        prisma.category.findUniqueOrThrow({ where: { id: category.id } }),
      ).resolves.toMatchObject({ quantity: 7 });
      const tickets = await prisma.ticket.findMany({
        where: { eventId: event.id },
      });
      expect(tickets.every((ticket) => ticket.status === 'CANCELED')).toBe(
        true,
      );
    });

    it('throws when the order has no payment', async () => {
      const buyer = await createBuyer(prisma);
      const order = await createOrder(prisma, buyer.id);

      await expect(service.rejectPayment(order.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
