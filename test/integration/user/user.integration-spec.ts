import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma.service';
import { UserModule } from 'src/user/user.module';
import { UserService } from 'src/user/user.service';
import { resetDatabase } from '../setup/database';
import {
  TEST_PASSWORD,
  createBuyer,
  createEvent,
  createOrder,
  createOrganizer,
  createVenue,
} from '../support/factories';
import { createIntegrationModule } from '../support/test-module';

describe('UserService (integration)', () => {
  let service: UserService;
  let prisma: PrismaService;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const context = await createIntegrationModule([UserModule]);
    service = context.moduleRef.get(UserService);
    prisma = context.prisma;
    close = context.close;
  });

  afterAll(async () => {
    await close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  describe('create', () => {
    it('persists a buyer with a bcrypt hash and hides the hash from the result', async () => {
      const dto = {
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        password: TEST_PASSWORD,
      };

      const result = await service.create(dto);
      const stored = await prisma.user.findUniqueOrThrow({
        where: { email: dto.email },
      });

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toMatchObject({
        id: stored.id,
        name: dto.name,
        email: dto.email,
        role: 'BUYER',
      });
      expect(stored.passwordHash).not.toBe(dto.password);
      await expect(
        bcrypt.compare(dto.password, stored.passwordHash),
      ).resolves.toBe(true);
    });

    it('persists a PENDING organizer application together with the user', async () => {
      const dto = {
        name: 'Organizer Applicant',
        email: 'applicant@example.com',
        password: TEST_PASSWORD,
      };
      const organizer = {
        legalName: 'Applicant Events LTDA',
        tradeName: 'Applicant Events',
        document: '12345678000190',
      };

      const result = await service.create(dto, organizer);

      const storedUser = await prisma.user.findUniqueOrThrow({
        where: { id: result.id },
      });
      const application = await prisma.organizerAplication.findUniqueOrThrow({
        where: { userId: result.id },
      });

      expect(storedUser.role).toBe('BUYER');
      expect(application).toMatchObject({
        legalName: organizer.legalName,
        tradeName: organizer.tradeName,
        document: organizer.document,
        status: 'PENDING',
      });
    });

    it('rejects a duplicated email and does not create another row', async () => {
      const existing = await createBuyer(prisma, {
        email: 'duplicated@example.com',
      });

      await expect(
        service.create({
          name: 'Another User',
          email: existing.email,
          password: TEST_PASSWORD,
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      await expect(
        prisma.user.count({ where: { email: existing.email } }),
      ).resolves.toBe(1);
    });

    it('rejects a document already used by another organizer application', async () => {
      const owner = await createBuyer(prisma);
      const document = '11222333000181';

      await prisma.organizerAplication.create({
        data: {
          userId: owner.id,
          legalName: 'Existing Application',
          document,
          status: 'PENDING',
        },
      });

      await expect(
        service.create(
          {
            name: 'New Applicant',
            email: 'new.applicant@example.com',
            password: TEST_PASSWORD,
          },
          {
            legalName: 'New Application',
            document,
          },
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      await expect(
        prisma.user.count({ where: { email: 'new.applicant@example.com' } }),
      ).resolves.toBe(0);
    });

    it('rejects a document already used by an organizer profile', async () => {
      const { profile } = await createOrganizer(prisma, {
        email: 'existing.organizer@example.com',
      });

      await expect(
        service.create(
          {
            name: 'New Applicant',
            email: 'new.applicant@example.com',
            password: TEST_PASSWORD,
          },
          {
            legalName: 'New Application',
            document: profile.document,
          },
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      await expect(
        prisma.user.count({ where: { email: 'new.applicant@example.com' } }),
      ).resolves.toBe(0);
    });
  });

  describe('findByEmail', () => {
    it('returns the persisted user when the email exists', async () => {
      const user = await createBuyer(prisma, {
        email: 'find.by.email@example.com',
      });

      const found = await service.findByEmail(user.email);

      expect(found).toMatchObject({
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
      });
    });

    it('returns null when the email does not exist', async () => {
      await expect(
        service.findByEmail('missing@example.com'),
      ).resolves.toBeNull();
    });
  });

  describe('findById', () => {
    it('returns the persisted user when the id exists', async () => {
      const user = await createBuyer(prisma);

      const found = await service.findById(user.id);

      expect(found).toMatchObject({ id: user.id, email: user.email });
    });

    it('returns null when the id does not exist', async () => {
      await expect(
        service.findById('00000000-0000-0000-0000-000000000000'),
      ).resolves.toBeNull();
    });
  });

  describe('findOrganizerApplicationByUserId', () => {
    it('returns the application linked to the user', async () => {
      const user = await createBuyer(prisma);

      const application = await prisma.organizerAplication.create({
        data: {
          userId: user.id,
          legalName: 'Linked Application',
          document: '44555666000177',
          status: 'REJECTED',
          rejectedReason: 'Incomplete data',
        },
      });

      const found = await service.findOrganizerApplicationByUserId(user.id);

      expect(found).toMatchObject({
        id: application.id,
        status: 'REJECTED',
        rejectedReason: 'Incomplete data',
      });
    });

    it('returns null when the user has no application', async () => {
      const user = await createBuyer(prisma);

      await expect(
        service.findOrganizerApplicationByUserId(user.id),
      ).resolves.toBeNull();
    });
  });

  describe('ensureDocumentIsUnique', () => {
    it('resolves when the document is not used', async () => {
      await expect(
        service.ensureDocumentIsUnique('99888777000166'),
      ).resolves.toBeUndefined();
    });

    it('rejects a document used by an application from another user', async () => {
      const user = await createBuyer(prisma);
      const document = '12312312312345';

      await prisma.organizerAplication.create({
        data: {
          userId: user.id,
          legalName: 'Other Application',
          document,
        },
      });

      await expect(
        service.ensureDocumentIsUnique(document),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a document used by an organizer profile', async () => {
      const { profile } = await createOrganizer(prisma);

      await expect(
        service.ensureDocumentIsUnique(profile.document),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('allows an application document owned by the excluded user', async () => {
      const user = await createBuyer(prisma);
      const document = '77766655544433';

      await prisma.organizerAplication.create({
        data: {
          userId: user.id,
          legalName: 'Owned Application',
          document,
        },
      });

      await expect(
        service.ensureDocumentIsUnique(document, user.id),
      ).resolves.toBeUndefined();
    });

    it('rejects an excluded user document when a profile also uses it', async () => {
      const user = await createBuyer(prisma);
      const document = '22233344455566';

      await prisma.organizerAplication.create({
        data: {
          userId: user.id,
          legalName: 'Owned Application',
          document,
        },
      });
      await createOrganizer(prisma, {}, { document });

      await expect(
        service.ensureDocumentIsUnique(document, user.id),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('deleteUser', () => {
    it('throws NotFoundException when the user does not exist', async () => {
      await expect(
        service.deleteUser('00000000-0000-0000-0000-000000000000'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses to delete a buyer that has orders', async () => {
      const user = await createBuyer(prisma);
      await createOrder(prisma, user.id);

      await expect(service.deleteUser(user.id)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      await expect(prisma.user.count({ where: { id: user.id } })).resolves.toBe(
        1,
      );
    });

    it('deletes a buyer and cascades their refresh tokens', async () => {
      const user = await createBuyer(prisma);
      const refreshToken = await prisma.refreshToken.create({
        data: {
          token: 'refresh-token-to-be-removed',
          userId: user.id,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });

      const deleted = await service.deleteUser(user.id);

      expect(deleted.id).toBe(user.id);
      await expect(
        prisma.user.findUnique({ where: { id: user.id } }),
      ).resolves.toBeNull();
      await expect(
        prisma.refreshToken.findUnique({ where: { id: refreshToken.id } }),
      ).resolves.toBeNull();
    });

    it('deletes an organizer and all their venues and events first', async () => {
      const { user, profile } = await createOrganizer(prisma);
      const firstVenue = await createVenue(prisma, profile.id);
      const secondVenue = await createVenue(prisma, profile.id);
      const firstEvent = await createEvent(prisma, profile.id, firstVenue.id);
      const secondEvent = await createEvent(prisma, profile.id, secondVenue.id);

      const deleted = await service.deleteUser(user.id);

      expect(deleted.id).toBe(user.id);
      await expect(
        prisma.user.findUnique({ where: { id: user.id } }),
      ).resolves.toBeNull();
      await expect(
        prisma.organizerProfile.findUnique({ where: { id: profile.id } }),
      ).resolves.toBeNull();
      await expect(
        prisma.venue.count({
          where: { id: { in: [firstVenue.id, secondVenue.id] } },
        }),
      ).resolves.toBe(0);
      await expect(
        prisma.event.count({
          where: { id: { in: [firstEvent.id, secondEvent.id] } },
        }),
      ).resolves.toBe(0);
    });
  });
});
