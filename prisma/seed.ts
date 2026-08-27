import { PrismaClient, Prisma } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { faker } from '@faker-js/faker/locale/pt_BR';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

faker.seed(42);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = '123456';
const FEE_RATE = new Prisma.Decimal('0.05');

function ticketCode(): string {
  return `TKT-${randomBytes(12).toString('base64url')}`;
}

function fakeAddress() {
  return {
    street: faker.location.streetAddress(),
    number: faker.location.buildingNumber(),
    district: faker.location.secondaryAddress(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    zipCode: faker.location.zipCode('#####-###'),
  };
}

function calcOrder(amounts: { unitPrice: Prisma.Decimal; quantity: number }[]) {
  const subtotal = amounts.reduce(
    (acc, { unitPrice, quantity }) => acc.plus(unitPrice.times(quantity)),
    new Prisma.Decimal(0),
  );
  const fee = subtotal.times(FEE_RATE).toDecimalPlaces(2);
  const total = subtotal.plus(fee);
  return { subtotal, fee, total };
}

function randomEventName(): string {
  const types = [
    'Festival',
    'Show',
    'Concerto',
    'Balada',
    'Rave',
    'Encontro',
    'Festa',
    'Gala',
    'Feira',
    'Exposição',
  ];
  const themes = [
    'Rock',
    'Sertanejo',
    'Eletrônico',
    'Pop',
    'Hip Hop',
    'MPB',
    'Forró',
    'Axé',
    'Pagode',
    'Funk',
  ];
  const adjectives = [
    'Grandioso',
    'Incrível',
    'Épico',
    'Único',
    'Especial',
    'Memorável',
    'Fantástico',
    'Maravilhoso',
  ];
  return `${faker.helpers.arrayElement(adjectives)} ${faker.helpers.arrayElement(types)} de ${faker.helpers.arrayElement(themes)}`;
}

async function main() {
  console.log('--- Cleaning database ---');
  await prisma.$transaction([
    prisma.ticket.deleteMany(),
    prisma.paymentWebhookEvent.deleteMany(),
    prisma.gatewayCustomer.deleteMany(),
    prisma.paymentAccount.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.category.deleteMany(),
    prisma.event.deleteMany(),
    prisma.venue.deleteMany(),
    prisma.organizerAplication.deleteMany(),
    prisma.organizerProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  console.log('Database cleaned');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  // ── Users ──────────────────────────────────────────────────
  console.log('--- Creating users ---');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@email.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@email.com',
      passwordHash: hashedPassword,
      role: 'ADMIN',
    },
  });

  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@email.com' },
    update: {},
    create: {
      name: 'Carlos Mendes',
      email: 'organizer@email.com',
      passwordHash: hashedPassword,
      role: 'ORGANIZER',
    },
  });

  const organizer2 = await prisma.user.upsert({
    where: { email: 'maria@email.com' },
    update: {},
    create: {
      name: 'Maria Santos',
      email: 'maria@email.com',
      passwordHash: hashedPassword,
      role: 'ORGANIZER',
    },
  });

  const buyerEmails = new Set<string>();
  const buyers = await Promise.all(
    Array.from({ length: 7 }, async (_, i) => {
      let email: string;
      do {
        email = faker.internet.email().toLowerCase();
      } while (buyerEmails.has(email));
      buyerEmails.add(email);

      return prisma.user.create({
        data: {
          name: faker.person.fullName(),
          email,
          passwordHash: hashedPassword,
          role: 'BUYER',
        },
      });
    }),
  );

  console.log(
    `Users: admin, ${organizer.name}, ${organizer2.name}, ${buyers.map((b) => b.name).join(', ')}`,
  );

  // ── Organizer Profiles ─────────────────────────────────────
  console.log('--- Creating organizer profiles ---');

  const organizerProfile = await prisma.organizerProfile.create({
    data: {
      legalName: 'Mendes Eventos LTDA',
      tradeName: 'Mendes Events',
      document: '12345678000199',
      userId: organizer.id,
    },
  });

  const organizerProfile2 = await prisma.organizerProfile.create({
    data: {
      legalName: 'Santos Produções Artísticas LTDA',
      tradeName: 'Santos Produções',
      document: '98765432000188',
      userId: organizer2.id,
    },
  });

  console.log(
    `Organizer profiles: ${organizerProfile.tradeName}, ${organizerProfile2.tradeName}`,
  );

  // ── Organizer Applications ─────────────────────────────────
  console.log('--- Creating organizer applications ---');

  await prisma.organizerAplication.create({
    data: {
      legalName: organizerProfile.legalName,
      tradeName: organizerProfile.tradeName,
      document: organizerProfile.document,
      status: 'APPROVED',
      userId: organizer.id,
    },
  });

  await prisma.organizerAplication.create({
    data: {
      legalName: organizerProfile2.legalName,
      tradeName: organizerProfile2.tradeName,
      document: organizerProfile2.document,
      status: 'APPROVED',
      userId: organizer2.id,
    },
  });

  console.log('Organizer applications created');

  // ── Venues ─────────────────────────────────────────────────
  console.log('--- Creating venues ---');

  const venuesData = [
    {
      name: 'Arena São Paulo',
      capacity: 45000,
      organizerProfileId: organizerProfile.id,
    },
    {
      name: 'Estádio Olímpico',
      capacity: 60000,
      organizerProfileId: organizerProfile2.id,
    },
    {
      name: 'Centro de Convenções',
      capacity: 5000,
      organizerProfileId: organizerProfile.id,
    },
    {
      name: 'Teatro Municipal',
      capacity: 2000,
      organizerProfileId: organizerProfile2.id,
    },
  ];

  const venues = await Promise.all(
    venuesData.map((data) =>
      prisma.venue.create({
        data: {
          ...data,
          ...fakeAddress(),
        },
      }),
    ),
  );

  console.log(
    `Venues: ${venues.map((v) => `${v.name} (${v.city}/${v.state})`).join(', ')}`,
  );

  // ── Events ─────────────────────────────────────────────────
  console.log('--- Creating events ---');

  const eventsData = [
    {
      name: 'Carnaval 2026',
      description: 'O maior carnaval do Brasil com shows ao vivo e desfiles.',
      startDate: new Date('2026-02-14T20:00:00Z'),
      endDate: new Date('2026-02-17T04:00:00Z'),
      status: 'PUBLISHED' as const,
      organizerProfileId: organizerProfile.id,
      venueId: venues[0].id,
    },
    {
      name: 'Lollapalooza Brasil 2026',
      description:
        'Festival internacional de música com atrações de todo o mundo.',
      startDate: new Date('2026-03-28T14:00:00Z'),
      endDate: new Date('2026-03-30T23:00:00Z'),
      status: 'PUBLISHED' as const,
      organizerProfileId: organizerProfile2.id,
      venueId: venues[1].id,
    },
    {
      name: 'Rock Underground',
      description: 'Show de rock alternativo com bandas nacionais.',
      startDate: new Date('2026-06-10T19:00:00Z'),
      endDate: new Date('2026-06-10T23:30:00Z'),
      status: 'DRAFT' as const,
      organizerProfileId: organizerProfile.id,
      venueId: venues[0].id,
    },
    (() => {
      const start = new Date(
        Date.now() + faker.number.int({ min: 30, max: 180 }) * 86_400_000,
      );
      const end = new Date(
        start.getTime() + faker.number.int({ min: 2, max: 8 }) * 3_600_000,
      );
      return {
        name: randomEventName(),
        description: faker.lorem.paragraph(),
        startDate: start,
        endDate: end,
        status: 'PUBLISHED' as const,
        organizerProfileId: organizerProfile2.id,
        venueId: venues[2].id,
      };
    })(),
    (() => {
      const start = new Date(
        Date.now() + faker.number.int({ min: 30, max: 180 }) * 86_400_000,
      );
      const end = new Date(
        start.getTime() + faker.number.int({ min: 2, max: 8 }) * 3_600_000,
      );
      return {
        name: randomEventName(),
        description: faker.lorem.paragraph(),
        startDate: start,
        endDate: end,
        status: 'DRAFT' as const,
        organizerProfileId: organizerProfile.id,
        venueId: venues[3].id,
      };
    })(),
  ];

  const events = await Promise.all(
    eventsData.map((data) =>
      prisma.event.create({
        data: {
          ...data,
          artists: Array.from(
            { length: faker.number.int({ min: 2, max: 5 }) },
            () => faker.person.fullName(),
          ),
          minimumAge: faker.helpers.arrayElement([18, 21, null]),
          imageUrl: faker.image.url(),
        },
      }),
    ),
  );

  console.log(
    `Events: ${events.map((e) => `${e.name} (${e.status})`).join(', ')}`,
  );

  // ── Categories ─────────────────────────────────────────────
  console.log('--- Creating categories ---');

  const categoriesData = [
    // Carnaval 2026
    {
      name: 'Pista',
      description: 'Acesso livre à pista de dança',
      price: '250.00',
      quantity: 30000,
      eventId: events[0].id,
    },
    {
      name: 'VIP',
      description: 'Acesso ao camarote com open bar e zona premium',
      price: '800.00',
      quantity: 500,
      eventId: events[0].id,
    },
    // Lollapalooza
    {
      name: 'Arquibancada',
      description: 'Assento numerado na arquibancada',
      price: '180.00',
      quantity: 20000,
      eventId: events[1].id,
    },
    {
      name: 'Camarote',
      description: 'Camarote com visão privilegiada e catering',
      price: '650.00',
      quantity: 1000,
      eventId: events[1].id,
    },
    // Rock Underground
    {
      name: 'Meia-entrada',
      description: 'Para estudantes e idosos (com comprovação)',
      price: '50.00',
      quantity: 1000,
      eventId: events[2].id,
    },
    {
      name: 'Inteira',
      description: 'Ingresso inteiro',
      price: '100.00',
      quantity: 2000,
      eventId: events[2].id,
    },
    // Evento aleatório 1
    {
      name: 'Pista',
      description: 'Acesso geral',
      price: faker.commerce.price({ min: 50, max: 300, dec: 2 }),
      quantity: faker.number.int({ min: 500, max: 5000 }),
      eventId: events[3].id,
    },
    {
      name: 'VIP',
      description: 'Acesso premium',
      price: faker.commerce.price({ min: 200, max: 1000, dec: 2 }),
      quantity: faker.number.int({ min: 100, max: 500 }),
      eventId: events[3].id,
    },
    // Evento aleatório 2
    {
      name: 'Inteira',
      description: 'Ingresso padrão',
      price: faker.commerce.price({ min: 30, max: 200, dec: 2 }),
      quantity: faker.number.int({ min: 300, max: 3000 }),
      eventId: events[4].id,
    },
  ];

  const categories = await Promise.all(
    categoriesData.map((data) =>
      prisma.category.create({
        data: {
          ...data,
          price: new Prisma.Decimal(data.price),
          salesStart: new Date(
            Date.now() - faker.number.int({ min: 1, max: 30 }) * 86_400_000,
          ),
          salesEnd: new Date(
            Date.now() + faker.number.int({ min: 15, max: 90 }) * 86_400_000,
          ),
        },
      }),
    ),
  );

  console.log(
    `Categories: ${categories.map((c) => `${c.name} ($${Number(c.price).toFixed(2)})`).join(', ')}`,
  );

  // ── Coupons ────────────────────────────────────────────────
  console.log('--- Creating coupons ---');

  const couponsData = [
    {
      code: 'CARNIVAL10',
      description: 'Desconto de 10% no Carnaval',
      discountType: 'PERCENTAGE' as const,
      value: new Prisma.Decimal('10.00'),
      expiresAt: new Date('2026-02-13T23:59:59Z'),
      maxUses: 100,
      eventId: events[0].id,
    },
    {
      code: 'FESTA20',
      description: 'Desconto de R$20 no Lollapalooza',
      discountType: 'FIXED' as const,
      value: new Prisma.Decimal('20.00'),
      expiresAt: new Date('2026-03-27T23:59:59Z'),
      maxUses: 50,
      eventId: events[1].id,
    },
    {
      code: 'PRIMEIRACOMPRA',
      description: 'Desconto de 15% para primeira compra',
      discountType: 'PERCENTAGE' as const,
      value: new Prisma.Decimal('15.00'),
      expiresAt: new Date('2026-12-31T23:59:59Z'),
      maxUses: 200,
    },
  ];

  const coupons = await Promise.all(
    couponsData.map((data) => prisma.coupon.create({ data })),
  );

  console.log(`Coupons: ${coupons.map((c) => c.code).join(', ')}`);

  // ── Gateway Customers ──────────────────────────────────────
  console.log('--- Creating gateway customers ---');

  const gatewayCustomers = await Promise.all(
    buyers.slice(0, 3).map((buyer) =>
      prisma.gatewayCustomer.create({
        data: {
          customerId: `cus_${faker.string.alphanumeric(14)}`,
          provider: faker.helpers.arrayElement([
            'STRIPE',
            'MERCADO_PAGO',
            'ASAAS',
          ]),
          userId: buyer.id,
        },
      }),
    ),
  );

  console.log(`Gateway customers: ${gatewayCustomers.length}`);

  // ── Payment Accounts ───────────────────────────────────────
  console.log('--- Creating payment accounts ---');

  const paymentAccounts = await Promise.all([
    prisma.paymentAccount.create({
      data: {
        provider: 'ASAAS',
        accountId: `acc_${faker.string.alphanumeric(10)}`,
        isDefault: true,
        organizerProfileId: organizerProfile.id,
      },
    }),
    prisma.paymentAccount.create({
      data: {
        provider: 'MERCADO_PAGO',
        accountId: `acc_${faker.string.alphanumeric(10)}`,
        isDefault: true,
        organizerProfileId: organizerProfile2.id,
      },
    }),
  ]);

  console.log(`Payment accounts: ${paymentAccounts.length}`);

  // ── Orders ─────────────────────────────────────────────────
  console.log('--- Creating orders ---');

  // Order #1: Ana → Carnaval Pista ×2 (PAID)
  const o1Amounts = [{ unitPrice: categories[0].price, quantity: 2 }];
  const o1 = calcOrder(o1Amounts);

  const [t1a, t1b] = [ticketCode(), ticketCode()];
  const order1 = await prisma.order.create({
    data: {
      userId: buyers[0].id,
      subtotal: o1.subtotal,
      fee: o1.fee,
      total: o1.total,
      status: 'PAID',
      orderItems: {
        create: {
          quantity: 2,
          unitPrice: categories[0].price,
          total: categories[0].price.times(2),
          categoryId: categories[0].id,
          tickets: {
            create: [
              {
                code: t1a,
                qrCode: `http://localhost:3000/api/ticket/validate/${t1a}`,
                userId: buyers[0].id,
                eventId: events[0].id,
              },
              {
                code: t1b,
                qrCode: `http://localhost:3000/api/ticket/validate/${t1b}`,
                userId: buyers[0].id,
                eventId: events[0].id,
              },
            ],
          },
        },
      },
    },
    include: { orderItems: { include: { tickets: true } } },
  });

  await prisma.payment.create({
    data: {
      provider: 'ASAAS',
      paymentMethod: 'PIX',
      amount: order1.total,
      status: 'APPROVED',
      paidAt: new Date(),
      orderId: order1.id,
    },
  });

  console.log(
    `Order #1: ${buyers[0].email} → ${events[0].name} (${categories[0].name} ×2) = $${Number(order1.total).toFixed(2)} [PAID/APPROVED]`,
  );

  // Order #2: João → Lolla Arqui ×1 + Camarote ×1 (PENDING)
  const o2Amounts = [
    { unitPrice: categories[2].price, quantity: 1 },
    { unitPrice: categories[3].price, quantity: 1 },
  ];
  const o2 = calcOrder(o2Amounts);

  const t2a = ticketCode();
  const t2b = ticketCode();
  const order2 = await prisma.order.create({
    data: {
      userId: buyers[1].id,
      subtotal: o2.subtotal,
      fee: o2.fee,
      total: o2.total,
      status: 'PENDING',
      orderItems: {
        create: [
          {
            quantity: 1,
            unitPrice: categories[2].price,
            total: categories[2].price.times(1),
            categoryId: categories[2].id,
            tickets: {
              create: {
                code: t2a,
                qrCode: `http://localhost:3000/api/ticket/validate/${t2a}`,
                userId: buyers[1].id,
                eventId: events[1].id,
              },
            },
          },
          {
            quantity: 1,
            unitPrice: categories[3].price,
            total: categories[3].price.times(1),
            categoryId: categories[3].id,
            tickets: {
              create: {
                code: t2b,
                qrCode: `http://localhost:3000/api/ticket/validate/${t2b}`,
                userId: buyers[1].id,
                eventId: events[1].id,
              },
            },
          },
        ],
      },
    },
    include: { orderItems: { include: { tickets: true } } },
  });

  await prisma.payment.create({
    data: {
      provider: 'MERCADO_PAGO',
      paymentMethod: 'CREDIT_CARD',
      amount: order2.total,
      status: 'PENDING',
      orderId: order2.id,
    },
  });

  console.log(
    `Order #2: ${buyers[1].email} → ${events[1].name} (${categories[2].name} ×1 + ${categories[3].name} ×1) = $${Number(order2.total).toFixed(2)} [PENDING/PENDING]`,
  );

  // Order #3: Ana → Carnaval Pista ×1 (CANCELED / REFUNDED)
  const o3Amounts = [{ unitPrice: categories[0].price, quantity: 1 }];
  const o3 = calcOrder(o3Amounts);

  const t3 = ticketCode();
  const order3 = await prisma.order.create({
    data: {
      userId: buyers[0].id,
      subtotal: o3.subtotal,
      fee: o3.fee,
      total: o3.total,
      status: 'CANCELED',
      orderItems: {
        create: {
          quantity: 1,
          unitPrice: categories[0].price,
          total: categories[0].price.times(1),
          categoryId: categories[0].id,
          tickets: {
            create: {
              code: t3,
              qrCode: `http://localhost:3000/api/ticket/validate/${t3}`,
              userId: buyers[0].id,
              eventId: events[0].id,
              status: 'CANCELED',
            },
          },
        },
      },
    },
    include: { orderItems: { include: { tickets: true } } },
  });

  await prisma.payment.create({
    data: {
      provider: 'ASAAS',
      paymentMethod: 'PIX',
      amount: order3.total,
      status: 'REFUNDED',
      paidAt: new Date(Date.now() - 86400000),
      orderId: order3.id,
    },
  });

  console.log(
    `Order #3: ${buyers[0].email} → ${events[0].name} (${categories[0].name} ×1) = $${Number(order3.total).toFixed(2)} [CANCELED/REFUNDED]`,
  );

  // Order #4: João → Rock Underground Inteira ×3 (PENDING / FAILED)
  const o4Amounts = [{ unitPrice: categories[5].price, quantity: 3 }];
  const o4 = calcOrder(o4Amounts);

  const [t4a, t4b, t4c] = [ticketCode(), ticketCode(), ticketCode()];
  const order4 = await prisma.order.create({
    data: {
      userId: buyers[1].id,
      subtotal: o4.subtotal,
      fee: o4.fee,
      total: o4.total,
      status: 'PENDING',
      orderItems: {
        create: {
          quantity: 3,
          unitPrice: categories[5].price,
          total: categories[5].price.times(3),
          categoryId: categories[5].id,
          tickets: {
            create: [
              {
                code: t4a,
                qrCode: `http://localhost:3000/api/ticket/validate/${t4a}`,
                userId: buyers[1].id,
                eventId: events[2].id,
                status: 'CANCELED',
              },
              {
                code: t4b,
                qrCode: `http://localhost:3000/api/ticket/validate/${t4b}`,
                userId: buyers[1].id,
                eventId: events[2].id,
                status: 'CANCELED',
              },
              {
                code: t4c,
                qrCode: `http://localhost:3000/api/ticket/validate/${t4c}`,
                userId: buyers[1].id,
                eventId: events[2].id,
                status: 'CANCELED',
              },
            ],
          },
        },
      },
    },
    include: { orderItems: { include: { tickets: true } } },
  });

  await prisma.payment.create({
    data: {
      provider: 'PAGSEGURO',
      paymentMethod: 'BOLETO',
      amount: order4.total,
      status: 'FAILED',
      orderId: order4.id,
    },
  });

  console.log(
    `Order #4: ${buyers[1].email} → ${events[2].name} (${categories[5].name} ×3) = $${Number(order4.total).toFixed(2)} [PENDING/FAILED]`,
  );

  // ── Additional Orders (random) ────────────────────────────
  console.log('--- Creating additional random orders ---');

  const additionalOrders = await Promise.all(
    buyers.slice(2, 6).map(async (buyer, idx) => {
      const eventIdx = idx % events.length;
      const eventCategories = categories.filter(
        (c) => c.eventId === events[eventIdx].id,
      );
      const cat = faker.helpers.arrayElement(eventCategories);
      const qty = faker.number.int({ min: 1, max: 4 });
      const amounts = [{ unitPrice: cat.price, quantity: qty }];
      const { subtotal, fee, total } = calcOrder(amounts);

      const tickets = Array.from({ length: qty }, (_, i) => {
        const code = ticketCode();
        return {
          code,
          qrCode: `http://localhost:3000/api/ticket/validate/${code}`,
          userId: buyer.id,
          eventId: events[eventIdx].id,
          status: faker.helpers.arrayElement([
            'VALID',
            'VALID',
            'VALID',
            'CANCELED',
          ]),
        };
      });

      const order = await prisma.order.create({
        data: {
          userId: buyer.id,
          subtotal,
          fee,
          total,
          status: faker.helpers.arrayElement(['PAID', 'PAID', 'PENDING']),
          orderItems: {
            create: {
              quantity: qty,
              unitPrice: cat.price,
              total: cat.price.times(qty),
              categoryId: cat.id,
              tickets: { create: tickets },
            },
          },
        },
        include: { orderItems: { include: { tickets: true } } },
      });

      const paymentStatus =
        order.status === 'PAID'
          ? 'APPROVED'
          : faker.helpers.arrayElement(['PENDING', 'PENDING', 'FAILED']);
      await prisma.payment.create({
        data: {
          provider: faker.helpers.arrayElement([
            'ASAAS',
            'MERCADO_PAGO',
            'PAGSEGURO',
          ]),
          paymentMethod: faker.helpers.arrayElement([
            'PIX',
            'CREDIT_CARD',
            'BOLETO',
          ]),
          amount: order.total,
          status: paymentStatus,
          paidAt:
            paymentStatus === 'APPROVED'
              ? new Date(
                  Date.now() -
                    faker.number.int({ min: 1, max: 7 }) * 86_400_000,
                )
              : undefined,
          orderId: order.id,
        },
      });

      console.log(
        `Order #${idx + 5}: ${buyer.email} → ${events[eventIdx].name} (${cat.name} ×${qty}) = $${Number(total).toFixed(2)} [${order.status}/${paymentStatus}]`,
      );

      return order;
    }),
  );

  // ── Summary ────────────────────────────────────────────────
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.organizerProfile.count(),
    prisma.organizerAplication.count(),
    prisma.venue.count(),
    prisma.event.count(),
    prisma.category.count(),
    prisma.coupon.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.ticket.count(),
    prisma.payment.count(),
    prisma.gatewayCustomer.count(),
    prisma.paymentAccount.count(),
  ]);

  console.log('\n=== Seed Summary ===');
  console.log(`Users:               ${counts[0]}`);
  console.log(`Organizer Profiles:  ${counts[1]}`);
  console.log(`Organizer Apps:      ${counts[2]}`);
  console.log(`Venues:              ${counts[3]}`);
  console.log(`Events:              ${counts[4]}`);
  console.log(`Categories:          ${counts[5]}`);
  console.log(`Coupons:             ${counts[6]}`);
  console.log(`Orders:              ${counts[7]}`);
  console.log(`Order Items:         ${counts[8]}`);
  console.log(`Tickets:             ${counts[9]}`);
  console.log(`Payments:            ${counts[10]}`);
  console.log(`Gateway Customers:   ${counts[11]}`);
  console.log(`Payment Accounts:    ${counts[12]}`);
  console.log('\nSeed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
