import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma.service';

describe('Ticket (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let venueId: string;
  let eventId: string;
  let categoryId: string;
  let orderId: string;
  let ticketId: string;
  let ticketCode: string;

  const email = `e2e-ticket-${Date.now()}@test.com`;
  const password = 'Test1234';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/register', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'E2E Ticket User', email, password })
      .expect(201)
      .expect((res) => {
        expect(res.body.accessToken).toBeDefined();
        accessToken = res.body.accessToken;
      });
  });

  it('promotes the user to ORGANIZER with an organizer profile', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ORGANIZER' },
    });
    await prisma.organizerProfile.create({
      data: {
        userId: user.id,
        legalName: 'E2E Organizer',
        document: '12345678000100',
      },
    });

    const login = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email, password })
      .expect(200);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    accessToken = login.body.accessToken;
    expect(accessToken).toBeDefined();
  });

  it('POST /venue', () => {
    return request(app.getHttpServer())
      .post('/venue')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'E2E Venue', capacity: 1000 })
      .expect(201)
      .expect((res) => {
        venueId = res.body.id;
        expect(venueId).toBeDefined();
      });
  });

  it('POST /event', () => {
    return request(app.getHttpServer())
      .post('/event')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'E2E Concert',
        artists: ['Test Artist'],
        startDate: new Date('2026-12-31T20:00:00Z').toISOString(),
        venueId,
      })
      .expect(201)
      .expect((res) => {
        eventId = res.body.id;
        expect(eventId).toBeDefined();
      });
  });

  it('POST /event/:eventId/category', () => {
    return request(app.getHttpServer())
      .post(`/event/${eventId}/category`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'E2E Pista',
        price: 100,
        quantity: 50,
        salesStart: new Date('2026-01-01T00:00:00Z').toISOString(),
        salesEnd: new Date('2026-12-30T23:59:59Z').toISOString(),
      })
      .expect(201)
      .expect((res) => {
        categoryId = res.body.id;
        expect(categoryId).toBeDefined();
      });
  });

  it('PATCH /event/:eventId/status → PUBLISHED', () => {
    return request(app.getHttpServer())
      .patch(`/event/${eventId}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'PUBLISHED' })
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('PUBLISHED');
      });
  });

  it('POST /order (creates tickets)', () => {
    return request(app.getHttpServer())
      .post('/order')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ items: [{ categoryId, quantity: 2 }] })
      .expect(201)
      .expect((res) => {
        orderId = res.body.id;
        expect(orderId).toBeDefined();
        expect(res.body.orderItems).toHaveLength(1);
        expect(res.body.orderItems[0].tickets).toHaveLength(2);
        ticketId = res.body.orderItems[0].tickets[0].id;
        ticketCode = res.body.orderItems[0].tickets[0].code;
        expect(ticketCode).toMatch(/^TKT-/);
        expect(res.body.payment.status).toBe('PENDING');
        expect(res.body.payment.id).toBeDefined();
      });
  });

  it('GET /ticket (list user tickets)', () => {
    return request(app.getHttpServer())
      .get('/ticket')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
      });
  });

  it('GET /ticket/:id (returns ticket detail)', () => {
    return request(app.getHttpServer())
      .get(`/ticket/${ticketId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(ticketId);
        expect(res.body.code).toBe(ticketCode);
        expect(res.body.status).toBe('VALID');
        expect(res.body.event).toBeDefined();
        expect(res.body.orderItem).toBeDefined();
      });
  });

  it('GET /ticket/validate/:code (public, returns valid)', () => {
    return request(app.getHttpServer())
      .get(`/ticket/validate/${ticketCode}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.valid).toBe(true);
        expect(res.body.ticket.code).toBe(ticketCode);
        expect(res.body.ticket.status).toBe('VALID');
        expect(res.body.event.name).toBe('E2E Concert');
        expect(res.body.event.venue.name).toBe('E2E Venue');
      });
  });

  it('PATCH /ticket/:id/use (mark as used)', () => {
    return request(app.getHttpServer())
      .patch(`/ticket/${ticketId}/use`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('USED');
      });
  });

  it('GET /ticket/validate/:code (returns valid: false after use)', () => {
    return request(app.getHttpServer())
      .get(`/ticket/validate/${ticketCode}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.valid).toBe(false);
        expect(res.body.ticket.status).toBe('USED');
      });
  });

  it('PATCH /ticket/:id/use (400 when already used)', () => {
    return request(app.getHttpServer())
      .patch(`/ticket/${ticketId}/use`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
  });

  it('GET /ticket/:id (403 for another user)', async () => {
    const otherEmail = `e2e-other-${Date.now()}@test.com`;
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Other', email: otherEmail, password });
    const otherToken = reg.body.accessToken;

    return request(app.getHttpServer())
      .get(`/ticket/${ticketId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
  });

  it('GET /ticket/validate/:code (404 for invalid code)', () => {
    return request(app.getHttpServer())
      .get('/ticket/validate/TKT-NONEXISTENT')
      .expect(404);
  });
});
