import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { RefreshTokenService } from 'src/auth/refresh-token.service';
import { PrismaService } from 'src/prisma.service';
import { resetDatabase } from '../setup/database';
import {
  TEST_PASSWORD,
  createBuyer,
  createOrganizer,
  createOrganizerApplication,
  randomDocument,
} from '../support/factories';
import { createIntegrationModule } from '../support/test-module';

describe('AuthService (integration)', () => {
  let service: AuthService;
  let refreshTokenService: RefreshTokenService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let prisma: PrismaService;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const context = await createIntegrationModule([AuthModule]);
    service = context.moduleRef.get(AuthService);
    refreshTokenService = context.moduleRef.get(RefreshTokenService);
    jwtService = context.moduleRef.get(JwtService);
    configService = context.moduleRef.get(ConfigService);
    prisma = context.prisma;
    close = context.close;
  });

  afterAll(async () => {
    await close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  const buyerPayload = (id: string, role: 'BUYER' | 'ORGANIZER' = 'BUYER') => ({
    id,
    role,
  });

  describe('register', () => {
    it('creates a buyer, returns tokens and hides the password hash', async () => {
      const result = await service.register({
        name: 'New Buyer',
        email: 'new.buyer@example.com',
        password: TEST_PASSWORD,
        role: 'BUYER',
      });

      expect(result.user).toMatchObject({
        name: 'New Buyer',
        email: 'new.buyer@example.com',
        role: 'BUYER',
      });
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));

      const payload = jwtService.verify<{
        sub: string;
        email: string;
        role: string;
      }>(result.accessToken);
      expect(payload).toMatchObject({
        sub: result.user.id,
        email: 'new.buyer@example.com',
        role: 'BUYER',
      });

      await expect(
        prisma.refreshToken.count({ where: { userId: result.user.id } }),
      ).resolves.toBe(1);
    });

    it('creates an organizer applicant as a buyer with a pending application', async () => {
      const document = randomDocument();

      const result = await service.register({
        name: 'Applicant',
        email: 'applicant@example.com',
        password: TEST_PASSWORD,
        role: 'ORGANIZER',
        organizer: {
          legalName: 'Applicant Events LTDA',
          tradeName: 'Applicant Events',
          document,
        },
      });

      const storedUser = await prisma.user.findUniqueOrThrow({
        where: { id: result.user.id },
      });
      expect(storedUser.role).toBe('BUYER');

      const application = await prisma.organizerAplication.findUniqueOrThrow({
        where: { userId: result.user.id },
      });
      expect(application).toMatchObject({
        legalName: 'Applicant Events LTDA',
        tradeName: 'Applicant Events',
        document,
        status: 'PENDING',
      });
    });

    it('rejects an organizer registration without organizer data', async () => {
      await expect(
        service.register({
          name: 'No Data',
          email: 'no.data@example.com',
          password: TEST_PASSWORD,
          role: 'ORGANIZER',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(prisma.user.count()).resolves.toBe(0);
    });

    it('rejects a buyer registration carrying organizer data', async () => {
      await expect(
        service.register({
          name: 'Buyer With Data',
          email: 'buyer.data@example.com',
          password: TEST_PASSWORD,
          role: 'BUYER',
          organizer: {
            legalName: 'Not Allowed',
            document: randomDocument(),
          },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(prisma.user.count()).resolves.toBe(0);
    });

    it('rejects a duplicated email without creating tokens', async () => {
      const existing = await createBuyer(prisma, {
        email: 'duplicated@example.com',
      });

      await expect(
        service.register({
          name: 'Duplicated',
          email: existing.email,
          password: TEST_PASSWORD,
          role: 'BUYER',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      await expect(
        prisma.refreshToken.count({ where: { userId: existing.id } }),
      ).resolves.toBe(0);
    });
  });

  describe('login', () => {
    it('returns a token pair and the safe user for valid credentials', async () => {
      const user = await createBuyer(prisma, {
        email: 'login@example.com',
      });

      const result = await service.login({
        email: user.email,
        password: TEST_PASSWORD,
      });

      expect(result.user).toMatchObject({ id: user.id, email: user.email });
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));

      const stored = await prisma.refreshToken.findUniqueOrThrow({
        where: { token: result.refreshToken },
      });
      expect(stored.userId).toBe(user.id);
      expect(stored.expiresAt.getTime()).toBeGreaterThan(
        Date.now() + 6 * 24 * 60 * 60 * 1000,
      );
      expect(stored.expiresAt.getTime()).toBeLessThan(
        Date.now() + 8 * 24 * 60 * 60 * 1000,
      );
    });

    it.each([
      ['unknown email', 'unknown@example.com', TEST_PASSWORD],
      ['wrong password', 'login-wrong@example.com', 'WrongPassword1!'],
    ])('rejects login with %s', async (_label, email, password) => {
      if (email.startsWith('login-wrong')) {
        await createBuyer(prisma, { email });
      }

      await expect(service.login({ email, password })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('refreshTokens', () => {
    it('rotates the refresh token and invalidates the previous one', async () => {
      const user = await createBuyer(prisma);
      const originalToken = await refreshTokenService.generateRefreshToken(
        user.id,
      );

      // Refresh tokens are signed with second precision. Waiting ensures the
      // rotated token is distinguishable from the original one.
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const result = await service.refreshTokens(originalToken);

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).not.toBe(originalToken);

      await expect(
        prisma.refreshToken.findUnique({ where: { token: originalToken } }),
      ).resolves.toBeNull();
      await expect(
        prisma.refreshToken.findUnique({
          where: { token: result.refreshToken },
        }),
      ).resolves.not.toBeNull();

      await expect(service.refreshTokens(originalToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it.todo(
      'generates a distinct token when rotation happens within the same second',
    );

    it('rejects an unknown refresh token', async () => {
      await expect(
        service.refreshTokens('not-a-real-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('removes an expired refresh token from the database', async () => {
      const user = await createBuyer(prisma);
      const token = await refreshTokenService.generateRefreshToken(user.id);
      await prisma.refreshToken.update({
        where: { token },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await expect(service.refreshTokens(token)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      await expect(
        prisma.refreshToken.findUnique({ where: { token } }),
      ).resolves.toBeNull();
    });

    it('rejects an expired JWT before reaching the database cleanup', async () => {
      const user = await createBuyer(prisma);
      const token = jwtService.sign(
        { sub: user.id },
        {
          secret: configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '-10s',
        },
      );
      await prisma.refreshToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });

      await expect(service.refreshTokens(token)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      await expect(
        prisma.refreshToken.findUnique({ where: { token } }),
      ).resolves.not.toBeNull();
    });

    it('rejects a token signed with another secret', async () => {
      const user = await createBuyer(prisma);
      const forged = jwtService.sign(
        { sub: user.id },
        { secret: 'another-secret', expiresIn: '1h' },
      );

      await expect(service.refreshTokens(forged)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('revokes the refresh token and is idempotent', async () => {
      const user = await createBuyer(prisma);
      const token = await refreshTokenService.generateRefreshToken(user.id);

      await service.logout(token);
      await expect(
        prisma.refreshToken.findUnique({ where: { token } }),
      ).resolves.toBeNull();

      await expect(service.logout(token)).resolves.toBeUndefined();
    });
  });

  describe('me', () => {
    it('returns the current user without the password hash', async () => {
      const user = await createBuyer(prisma);

      await expect(service.me(user.id)).resolves.toMatchObject({
        id: user.id,
        email: user.email,
        role: 'BUYER',
      });
      await expect(service.me(user.id)).resolves.not.toHaveProperty(
        'passwordHash',
      );
    });

    it('rejects an unknown user', async () => {
      await expect(
        service.me('00000000-0000-0000-0000-000000000000'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('getMyOrganizerApplication', () => {
    it('returns null when the user has no application', async () => {
      const user = await createBuyer(prisma);

      await expect(
        service.getMyOrganizerApplication(user.id),
      ).resolves.toBeNull();
    });

    it('returns the linked application', async () => {
      const user = await createBuyer(prisma);
      const application = await createOrganizerApplication(prisma, user.id, {
        status: 'REJECTED',
        rejectedReason: 'Incomplete data',
      });

      await expect(
        service.getMyOrganizerApplication(user.id),
      ).resolves.toMatchObject({
        id: application.id,
        status: 'REJECTED',
        rejectedReason: 'Incomplete data',
      });
    });
  });

  describe('submitOrganizerApplication', () => {
    it('creates a pending application for a buyer', async () => {
      const user = await createBuyer(prisma);
      const document = randomDocument();

      const application = await service.submitOrganizerApplication(
        buyerPayload(user.id),
        {
          legalName: 'New Application',
          tradeName: 'New Trade',
          document,
        },
      );

      expect(application).toMatchObject({
        userId: user.id,
        legalName: 'New Application',
        tradeName: 'New Trade',
        document,
        status: 'PENDING',
        rejectedReason: null,
      });
    });

    it.each(['ORGANIZER', 'ADMIN'] as const)(
      'rejects a %s payload',
      async (role) => {
        const user = await createBuyer(prisma);

        await expect(
          service.submitOrganizerApplication(
            { id: user.id, role },
            {
              legalName: 'Not Allowed',
              document: randomDocument(),
            },
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );

    it('rejects when the user already has an organizer profile', async () => {
      const { user } = await createOrganizer(prisma);

      await expect(
        service.submitOrganizerApplication(buyerPayload(user.id), {
          legalName: 'Duplicate Profile',
          document: randomDocument(),
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a pending application', async () => {
      const user = await createBuyer(prisma);
      await createOrganizerApplication(prisma, user.id);

      await expect(
        service.submitOrganizerApplication(buyerPayload(user.id), {
          legalName: 'Another Application',
          document: randomDocument(),
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects an approved application', async () => {
      const user = await createBuyer(prisma);
      await createOrganizerApplication(prisma, user.id, {
        status: 'APPROVED',
      });

      await expect(
        service.submitOrganizerApplication(buyerPayload(user.id), {
          legalName: 'Another Application',
          document: randomDocument(),
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('updates a rejected application back to pending', async () => {
      const user = await createBuyer(prisma);
      const document = randomDocument();
      await createOrganizerApplication(prisma, user.id, {
        status: 'REJECTED',
        rejectedReason: 'Incomplete data',
        document,
      });

      const application = await service.submitOrganizerApplication(
        buyerPayload(user.id),
        {
          legalName: 'Corrected Application',
          tradeName: 'Corrected',
          document,
        },
      );

      expect(application).toMatchObject({
        userId: user.id,
        legalName: 'Corrected Application',
        status: 'PENDING',
        rejectedReason: null,
      });
    });

    it('rejects a document used by another application', async () => {
      const owner = await createBuyer(prisma);
      const applicant = await createBuyer(prisma);
      const document = randomDocument();
      await createOrganizerApplication(prisma, owner.id, { document });

      await expect(
        service.submitOrganizerApplication(buyerPayload(applicant.id), {
          legalName: 'Conflicting Application',
          document,
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      await expect(
        prisma.organizerAplication.count({
          where: { userId: applicant.id },
        }),
      ).resolves.toBe(0);
    });

    it('rejects a document used by an organizer profile', async () => {
      const { profile } = await createOrganizer(prisma);
      const applicant = await createBuyer(prisma);

      await expect(
        service.submitOrganizerApplication(buyerPayload(applicant.id), {
          legalName: 'Conflicting Application',
          document: profile.document,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
