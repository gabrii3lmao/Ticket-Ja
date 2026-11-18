import { PrismaService } from 'src/prisma.service';
import { resetDatabase } from '../setup/database';
import { createIntegrationModule } from '../support/test-module';

describe('Integration database', () => {
  let prisma: PrismaService;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const context = await createIntegrationModule();
    prisma = context.prisma;
    close = context.close;
  });

  afterAll(async () => {
    await close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  it('connects to PostgreSQL and has the application migrations applied', async () => {
    const migrations = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL
    `;

    const tables = await prisma.$queryRaw<Array<{ name: string | null }>>`
      SELECT to_regclass('public."User"')::text AS name
    `;

    expect(migrations[0].count).toBeGreaterThan(0);
    expect(tables[0].name).toBe('"User"');
  });

  it('persists and reads a user through Prisma', async () => {
    const created = await prisma.user.create({
      data: {
        name: 'Integration User',
        email: 'integration@example.com',
        passwordHash: 'hashed-password',
      },
    });

    const found = await prisma.user.findUnique({
      where: { id: created.id },
    });

    expect(found).toMatchObject({
      id: created.id,
      name: 'Integration User',
      email: 'integration@example.com',
      role: 'BUYER',
    });
  });

  it('enforces the unique email constraint at the database level', async () => {
    const data = {
      name: 'Duplicated',
      email: 'duplicated@example.com',
      passwordHash: 'hashed-password',
    };

    await prisma.user.create({ data });

    await expect(prisma.user.create({ data })).rejects.toMatchObject({
      code: 'P2002',
    });
  });

  it('cleans every application table between tests', async () => {
    await prisma.user.create({
      data: {
        name: 'Temporary',
        email: 'temporary@example.com',
        passwordHash: 'hashed-password',
      },
    });

    await resetDatabase(prisma);

    await expect(prisma.user.count()).resolves.toBe(0);
  });
});
