// import { PrismaClient, Prisma } from '../generated/prisma/client';
// import { PrismaPg } from '@prisma/adapter-pg';
// import { fakerPT_BR } from '@faker-js/faker';
// import * as bcrypt from 'bcrypt';
// import { randomBytes } from 'node:crypto';

// const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
// const prisma = new PrismaClient({ adapter });

// const SALT_ROUNDS = 10;
// const DEFAULT_PASSWORD = '123456';
// const FEE_RATE = new Prisma.Decimal('0.05');

// function ticketCode(): string {
//   return `TKT-${randomBytes(12).toString('base64url')}`;
// }

// function fakeAddress() {
//   return {
//     street: fakerPT_BR.location.streetAddress(),
//     number: fakerPT_BR.location.buildingNumber(),
//     district: fakerPT_BR.location.secondaryAddress(),
//     city: fakerPT_BR.location.city(),
//     state: fakerPT_BR.location.state({ abbreviated: true }),
//     zipCode: fakerPT_BR.location.zipCode('#####-###'),
//   };
// }

// function calcOrder(amounts: { unitPrice: Prisma.Decimal; quantity: number }[]) {
//   const subtotal = amounts.reduce(
//     (acc, { unitPrice, quantity }) => acc.plus(unitPrice.times(quantity)),
//     new Prisma.Decimal(0),
//   );
//   const fee = subtotal.times(FEE_RATE).toDecimalPlaces(2);
//   const total = subtotal.plus(fee);
//   return { subtotal, fee, total };
// }

// async function main() {
//   console.log('--- Cleaning database ---');
//   await prisma.$transaction([
//     prisma.ticket.deleteMany(),
//     prisma.orderItem.deleteMany(),
//     prisma.payment.deleteMany(),
//     prisma.order.deleteMany(),
//     prisma.category.deleteMany(),
//     prisma.event.deleteMany(),
//     prisma.venue.deleteMany(),
//     prisma.user.deleteMany(),
//   ]);
//   console.log('Database cleaned');

//   const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

//   // ── Users ──────────────────────────────────────────────────
//   console.log('--- Creating users ---');

//   const admin = await prisma.user.upsert({
//     where: { email: 'admin@email.com' },
//     update: {},
//     create: {
//       name: 'Admin',
//       email: 'admin@email.com',
//       passwordHash: hashedPassword,
//     },
//   });

//   const organizer = await prisma.user.upsert({
//     where: { email: 'organizer@email.com' },
//     update: {},
//     create: {
//       name: 'Carlos Mendes',
//       email: 'organizer@email.com',
//       passwordHash: hashedPassword,
//     },
//   });

//   const organizer2 = await prisma.user.upsert({
//     where: { email: 'maria@email.com' },
//     update: {},
//     create: {
//       name: 'Maria Santos',
//       email: 'maria@email.com',
//       passwordHash: hashedPassword,
//     },
//   });

//   const buyer1 = await prisma.user.create({
//     data: {
//       name: fakerPT_BR.person.fullName(),
//       email: 'ana@email.com',
//       passwordHash: hashedPassword,
//     },
//   });

//   const buyer2 = await prisma.user.create({
//     data: {
//       name: fakerPT_BR.person.fullName(),
//       email: 'joao@email.com',
//       passwordHash: hashedPassword,
//     },
//   });

//   console.log(
//     `Users: ${admin.email}, ${organizer.email}, ${organizer2.email}, ${buyer1.email}, ${buyer2.email}`,
//   );

//   // ── Venues ─────────────────────────────────────────────────
//   console.log('--- Creating venues ---');

//   const venue1 = await prisma.venue.create({
//     data: {
//       name: 'Arena São Paulo',
//       ...fakeAddress(),
//       capacity: 45000,
//       organizerId: organizer.id,
//     },
//   });

//   const venue2 = await prisma.venue.create({
//     data: {
//       name: 'Estádio Olímpico',
//       ...fakeAddress(),
//       capacity: 60000,
//       organizerId: organizer2.id,
//     },
//   });

//   console.log(
//     `Venues: ${venue1.name} (${venue1.city}/${venue1.state}), ${venue2.name} (${venue2.city}/${venue2.state})`,
//   );

//   // ── Events ─────────────────────────────────────────────────
//   console.log('--- Creating events ---');

//   const event1 = await prisma.event.create({
//     data: {
//       name: 'Carnaval 2026',
//       description: fakerPT_BR.lorem.paragraph(),
//       artists: [
//         fakerPT_BR.music.artist(),
//         fakerPT_BR.music.artist(),
//         fakerPT_BR.music.artist(),
//       ],
//       startDate: new Date('2026-02-14T20:00:00Z'),
//       endDate: new Date('2026-02-17T04:00:00Z'),
//       status: 'PUBLISHED',
//       organizerId: organizer.id,
//       venueId: venue1.id,
//     },
//   });

//   const event2 = await prisma.event.create({
//     data: {
//       name: 'Lollapalooza Brasil 2026',
//       description: fakerPT_BR.lorem.paragraph(),
//       artists: [
//         fakerPT_BR.music.artist(),
//         fakerPT_BR.music.artist(),
//         fakerPT_BR.music.artist(),
//         fakerPT_BR.music.artist(),
//       ],
//       startDate: new Date('2026-03-28T14:00:00Z'),
//       endDate: new Date('2026-03-30T23:00:00Z'),
//       status: 'PUBLISHED',
//       organizerId: organizer2.id,
//       venueId: venue2.id,
//     },
//   });

//   const event3 = await prisma.event.create({
//     data: {
//       name: 'Rock Underground',
//       description: fakerPT_BR.lorem.paragraph(),
//       artists: [fakerPT_BR.music.artist(), fakerPT_BR.music.artist()],
//       startDate: new Date('2026-06-10T19:00:00Z'),
//       endDate: new Date('2026-06-10T23:30:00Z'),
//       status: 'DRAFT',
//       organizerId: organizer.id,
//       venueId: venue1.id,
//     },
//   });

//   console.log(
//     `Events: ${event1.name} (${event1.status}), ${event2.name} (${event2.status}), ${event3.name} (${event3.status})`,
//   );

//   // ── Categories ─────────────────────────────────────────────
//   console.log('--- Creating categories ---');

//   const catPista = await prisma.category.create({
//     data: {
//       name: 'Pista',
//       description: 'Acesso livre à pista de dança',
//       price: new Prisma.Decimal('250.00'),
//       quantity: 30000,
//       salesStart: new Date('2026-01-01T00:00:00Z'),
//       salesEnd: new Date('2026-02-13T23:59:59Z'),
//       eventId: event1.id,
//     },
//   });

//   const catVip = await prisma.category.create({
//     data: {
//       name: 'VIP',
//       description: 'Acesso ao camarote com open bar e zona premium',
//       price: new Prisma.Decimal('800.00'),
//       quantity: 500,
//       salesStart: new Date('2026-01-01T00:00:00Z'),
//       salesEnd: new Date('2026-02-13T23:59:59Z'),
//       eventId: event1.id,
//     },
//   });

//   const catArqui = await prisma.category.create({
//     data: {
//       name: 'Arquibancada',
//       description: 'Assento numerado na arquibancada',
//       price: new Prisma.Decimal('180.00'),
//       quantity: 20000,
//       salesStart: new Date('2026-02-01T00:00:00Z'),
//       salesEnd: new Date('2026-03-27T23:59:59Z'),
//       eventId: event2.id,
//     },
//   });

//   const catCamarote = await prisma.category.create({
//     data: {
//       name: 'Camarote',
//       description: 'Camarote com visão privilegiada e caterding',
//       price: new Prisma.Decimal('650.00'),
//       quantity: 1000,
//       salesStart: new Date('2026-02-01T00:00:00Z'),
//       salesEnd: new Date('2026-03-27T23:59:59Z'),
//       eventId: event2.id,
//     },
//   });

//   const catMeia = await prisma.category.create({
//     data: {
//       name: 'Meia-entrada',
//       description: 'Para estudantes e idosos (com comprovação)',
//       price: new Prisma.Decimal('50.00'),
//       quantity: 1000,
//       salesStart: new Date('2026-04-01T00:00:00Z'),
//       salesEnd: new Date('2026-06-09T23:59:59Z'),
//       eventId: event3.id,
//     },
//   });

//   const catInteira = await prisma.category.create({
//     data: {
//       name: 'Inteira',
//       description: 'Ingresso inteiro',
//       price: new Prisma.Decimal('100.00'),
//       quantity: 2000,
//       salesStart: new Date('2026-04-01T00:00:00Z'),
//       salesEnd: new Date('2026-06-09T23:59:59Z'),
//       eventId: event3.id,
//     },
//   });

//   console.log(
//     `Categories: ${catPista.name} ($${Number(catPista.price).toFixed(2)}), ${catVip.name} ($${Number(catVip.price).toFixed(2)}), ${catArqui.name} ($${Number(catArqui.price).toFixed(2)}), ${catCamarote.name} ($${Number(catCamarote.price).toFixed(2)}), ${catMeia.name} ($${Number(catMeia.price).toFixed(2)}), ${catInteira.name} ($${Number(catInteira.price).toFixed(2)})`,
//   );

//   // ── Order #1: Ana → Carnaval Pista ×2 (PAID) ──────────────
//   console.log('--- Creating orders ---');

//   const o1Amounts = [{ unitPrice: catPista.price, quantity: 2 }];
//   const o1 = calcOrder(o1Amounts);

//   const [t1a, t1b] = [ticketCode(), ticketCode()];
//   const order1 = await prisma.order.create({
//     data: {
//       userId: buyer1.id,
//       subtotal: o1.subtotal,
//       fee: o1.fee,
//       total: o1.total,
//       status: 'PAID',
//       orderItems: {
//         create: {
//           quantity: 2,
//           unitPrice: catPista.price,
//           total: catPista.price.times(2),
//           categoryId: catPista.id,
//           tickets: {
//             create: [
//               {
//                 code: t1a,
//                 qrCode: `http://localhost:3000/api/ticket/validate/${t1a}`,
//                 userId: buyer1.id,
//                 eventId: event1.id,
//               },
//               {
//                 code: t1b,
//                 qrCode: `http://localhost:3000/api/ticket/validate/${t1b}`,
//                 userId: buyer1.id,
//                 eventId: event1.id,
//               },
//             ],
//           },
//         },
//       },
//     },
//     include: { orderItems: { include: { tickets: true } } },
//   });

//   await prisma.payment.create({
//     data: {
//       provider: 'ASAAS',
//       paymentMethod: 'PIX',
//       amount: order1.total,
//       status: 'APPROVED',
//       paidAt: new Date(),
//       orderId: order1.id,
//     },
//   });

//   console.log(
//     `Order #1: ${buyer1.email} → ${event1.name} (${catPista.name} ×2) = $${Number(order1.total).toFixed(2)} [PAID/APPROVED]`,
//   );

//   // ── Order #2: João → Lolla Arqui ×1 + Camarote ×1 (PENDING) ──
//   const o2Amounts = [
//     { unitPrice: catArqui.price, quantity: 1 },
//     { unitPrice: catCamarote.price, quantity: 1 },
//   ];
//   const o2 = calcOrder(o2Amounts);

//   const t2a = ticketCode();
//   const t2b = ticketCode();
//   const order2 = await prisma.order.create({
//     data: {
//       userId: buyer2.id,
//       subtotal: o2.subtotal,
//       fee: o2.fee,
//       total: o2.total,
//       status: 'PENDING',
//       orderItems: {
//         create: [
//           {
//             quantity: 1,
//             unitPrice: catArqui.price,
//             total: catArqui.price.times(1),
//             categoryId: catArqui.id,
//             tickets: {
//               create: {
//                 code: t2a,
//                 qrCode: `http://localhost:3000/api/ticket/validate/${t2a}`,
//                 userId: buyer2.id,
//                 eventId: event2.id,
//               },
//             },
//           },
//           {
//             quantity: 1,
//             unitPrice: catCamarote.price,
//             total: catCamarote.price.times(1),
//             categoryId: catCamarote.id,
//             tickets: {
//               create: {
//                 code: t2b,
//                 qrCode: `http://localhost:3000/api/ticket/validate/${t2b}`,
//                 userId: buyer2.id,
//                 eventId: event2.id,
//               },
//             },
//           },
//         ],
//       },
//     },
//     include: { orderItems: { include: { tickets: true } } },
//   });

//   await prisma.payment.create({
//     data: {
//       provider: 'MERCADO_PAGO',
//       paymentMethod: 'CREDIT_CARD',
//       amount: order2.total,
//       status: 'PENDING',
//       orderId: order2.id,
//     },
//   });

//   console.log(
//     `Order #2: ${buyer2.email} → ${event2.name} (${catArqui.name} ×1 + ${catCamarote.name} ×1) = $${Number(order2.total).toFixed(2)} [PENDING/PENDING]`,
//   );

//   // ── Order #3: Ana → Carnaval Pista ×1 (CANCELED / REFUNDED) ──
//   const o3Amounts = [{ unitPrice: catPista.price, quantity: 1 }];
//   const o3 = calcOrder(o3Amounts);

//   const t3 = ticketCode();
//   const order3 = await prisma.order.create({
//     data: {
//       userId: buyer1.id,
//       subtotal: o3.subtotal,
//       fee: o3.fee,
//       total: o3.total,
//       status: 'CANCELED',
//       orderItems: {
//         create: {
//           quantity: 1,
//           unitPrice: catPista.price,
//           total: catPista.price.times(1),
//           categoryId: catPista.id,
//           tickets: {
//             create: {
//               code: t3,
//               qrCode: `http://localhost:3000/api/ticket/validate/${t3}`,
//               userId: buyer1.id,
//               eventId: event1.id,
//               status: 'CANCELED',
//             },
//           },
//         },
//       },
//     },
//     include: { orderItems: { include: { tickets: true } } },
//   });

//   await prisma.payment.create({
//     data: {
//       provider: 'ASAAS',
//       paymentMethod: 'PIX',
//       amount: order3.total,
//       status: 'REFUNDED',
//       paidAt: new Date(Date.now() - 86400000),
//       orderId: order3.id,
//     },
//   });

//   console.log(
//     `Order #3: ${buyer1.email} → ${event1.name} (${catPista.name} ×1) = $${Number(order3.total).toFixed(2)} [CANCELED/REFUNDED]`,
//   );

//   // ── Order #4: João → Rock Underground Inteira ×3 (PENDING / FAILED) ──
//   const o4Amounts = [{ unitPrice: catInteira.price, quantity: 3 }];
//   const o4 = calcOrder(o4Amounts);

//   const [t4a, t4b, t4c] = [ticketCode(), ticketCode(), ticketCode()];
//   const order4 = await prisma.order.create({
//     data: {
//       userId: buyer2.id,
//       subtotal: o4.subtotal,
//       fee: o4.fee,
//       total: o4.total,
//       status: 'PENDING',
//       orderItems: {
//         create: {
//           quantity: 3,
//           unitPrice: catInteira.price,
//           total: catInteira.price.times(3),
//           categoryId: catInteira.id,
//           tickets: {
//             create: [
//               {
//                 code: t4a,
//                 qrCode: `http://localhost:3000/api/ticket/validate/${t4a}`,
//                 userId: buyer2.id,
//                 eventId: event3.id,
//                 status: 'CANCELED',
//               },
//               {
//                 code: t4b,
//                 qrCode: `http://localhost:3000/api/ticket/validate/${t4b}`,
//                 userId: buyer2.id,
//                 eventId: event3.id,
//                 status: 'CANCELED',
//               },
//               {
//                 code: t4c,
//                 qrCode: `http://localhost:3000/api/ticket/validate/${t4c}`,
//                 userId: buyer2.id,
//                 eventId: event3.id,
//                 status: 'CANCELED',
//               },
//             ],
//           },
//         },
//       },
//     },
//     include: { orderItems: { include: { tickets: true } } },
//   });

//   await prisma.payment.create({
//     data: {
//       provider: 'PAGSEGURO',
//       paymentMethod: 'BOLETO',
//       amount: order4.total,
//       status: 'FAILED',
//       orderId: order4.id,
//     },
//   });

//   console.log(
//     `Order #4: ${buyer2.email} → ${event3.name} (${catInteira.name} ×3) = $${Number(order4.total).toFixed(2)} [PENDING/FAILED]`,
//   );

//   // ── Summary ────────────────────────────────────────────────
//   const counts = await Promise.all([
//     prisma.user.count(),
//     prisma.venue.count(),
//     prisma.event.count(),
//     prisma.category.count(),
//     prisma.order.count(),
//     prisma.orderItem.count(),
//     prisma.ticket.count(),
//     prisma.payment.count(),
//   ]);

//   console.log('\n=== Seed Summary ===');
//   console.log(`Users:       ${counts[0]}`);
//   console.log(`Venues:      ${counts[1]}`);
//   console.log(`Events:      ${counts[2]}`);
//   console.log(`Categories:  ${counts[3]}`);
//   console.log(`Orders:      ${counts[4]}`);
//   console.log(`OrderItems:  ${counts[5]}`);
//   console.log(`Tickets:     ${counts[6]}`);
//   console.log(`Payments:    ${counts[7]}`);
//   console.log('Seed completed successfully');
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(() => prisma.$disconnect());
