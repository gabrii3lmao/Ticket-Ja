// import { PrismaClient } from '../generated/prisma/client';
// import { PrismaPg } from '@prisma/adapter-pg';
// import * as bcrypt from 'bcrypt';

// const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
// const prisma = new PrismaClient({ adapter });

// async function main() {
//   const hashedPassword = await bcrypt.hash('123456', 10);

//   const user = await prisma.user.upsert({
//     where: { email: 'admin@email.com' },
//     update: {},
//     create: {
//       name: 'Admin',
//       email: 'admin@email.com',
//       passwordHash: hashedPassword,
//     },
//   });

//   const events = [
//     {
//       name: 'Rock in Rio',
//       artist: 'Various',
//       organizer: 'Rock World',
//       date: new Date('2026-09-15'),
//       userId: user.id,
//     },
//     {
//       name: 'Lollapalooza',
//       artist: 'Various',
//       organizer: 'Lolla BR',
//       date: new Date('2026-03-20'),
//       userId: user.id,
//     },
//   ];

//   for (const event of events) {
//     await prisma.event.create({ data: event });
//   }

//   console.log('Seed completed successfully');
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(() => prisma.$disconnect());
