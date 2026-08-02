import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@email.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@email.com',
      passwordHash: hashedPassword,
    },
  });

  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@email.com' },
    update: {},
    create: {
      name: 'Organizer',
      email: 'organizer@email.com',
      passwordHash: hashedPassword,
    },
  });

  const venue = await prisma.venue.upsert({
    where: { id: 'seed-venue-001' },
    update: {},
    create: {
      id: 'seed-venue-001',
      name: 'Maracanã',
      street: 'Rua Professor Eurico Rabelo',
      number: '198',
      district: 'Maracanã',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '20271-150',
      capacity: 78838,
      organizerId: organizer.id,
    },
  });

  const event = await prisma.event.upsert({
    where: { id: 'seed-event-001' },
    update: {},
    create: {
      id: 'seed-event-001',
      name: 'Rock in Rio 2026',
      description: 'O maior festival de música do mundo',
      artists: ['Queen', 'Iron Maiden', 'Scorpions', 'Capital Inicial'],
      startDate: new Date('2026-09-15T20:00:00Z'),
      endDate: new Date('2026-09-22T04:00:00Z'),
      status: 'PUBLISHED',
      organizerId: organizer.id,
      venueId: venue.id,
    },
  });

  const pista = await prisma.category.upsert({
    where: { id: 'seed-cat-001' },
    update: {},
    create: {
      id: 'seed-cat-001',
      name: 'Pista',
      description: 'Acesso à pista do evento',
      price: 350,
      quantity: 5000,
      salesStart: new Date('2026-07-01T00:00:00Z'),
      salesEnd: new Date('2026-09-14T23:59:59Z'),
      eventId: event.id,
    },
  });

  await prisma.category.upsert({
    where: { id: 'seed-cat-002' },
    update: {},
    create: {
      id: 'seed-cat-002',
      name: 'VIP',
      description: 'Acesso ao camarote com open bar',
      price: 1200,
      quantity: 500,
      salesStart: new Date('2026-07-01T00:00:00Z'),
      salesEnd: new Date('2026-09-14T23:59:59Z'),
      eventId: event.id,
    },
  });

  await prisma.event.upsert({
    where: { id: 'seed-event-002' },
    update: {},
    create: {
      id: 'seed-event-002',
      name: 'Lollapalooza 2026',
      description: 'Festival alternativo com bands nacionais e internacionais',
      artists: ['Tame Impala', 'The Strokes', 'Arctic Monkeys'],
      startDate: new Date('2026-03-28T14:00:00Z'),
      endDate: new Date('2026-03-30T23:00:00Z'),
      status: 'DRAFT',
      organizerId: organizer.id,
      venueId: venue.id,
    },
  });

  const existingOrder = await prisma.order.findFirst({
    where: { userId: admin.id },
  });

  if (!existingOrder) {
    const quantity = 2;
    const unitPrice = Number(pista.price);
    const subtotal = unitPrice * quantity;
    const fee = Math.round(subtotal * 0.05 * 100) / 100;
    const total = subtotal + fee;

    const order = await prisma.order.create({
      data: {
        subtotal,
        fee,
        total,
        userId: admin.id,
      },
    });

    const orderItem = await prisma.orderItem.create({
      data: {
        quantity,
        unitPrice,
        total: subtotal,
        orderId: order.id,
        categoryId: pista.id,
      },
    });

    for (let i = 0; i < quantity; i++) {
      const code = `TKT-${randomUUID().split('-')[0].toUpperCase()}`;
      await prisma.ticket.create({
        data: {
          code,
          qrCode: `http://localhost:3000/api/ticket/validate/${code}`,
          userId: admin.id,
          orderItemId: orderItem.id,
          eventId: event.id,
        },
      });
    }

    await prisma.payment.create({
      data: {
        provider: 'ASAAS',
        paymentMethod: 'PIX',
        amount: total,
        orderId: order.id,
      },
    });

    console.log(`Order ${order.id} created with ${quantity} tickets`);
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
