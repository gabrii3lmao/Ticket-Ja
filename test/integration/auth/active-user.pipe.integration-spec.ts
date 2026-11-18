import { NotFoundException } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { ActiveUserPipe } from 'src/auth/pipes/active-user.pipe';
import { PrismaService } from 'src/prisma.service';
import { resetDatabase } from '../setup/database';
import { createBuyer } from '../support/factories';
import { createIntegrationModule } from '../support/test-module';

describe('ActiveUserPipe (integration)', () => {
  let pipe: ActiveUserPipe;
  let prisma: PrismaService;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const context = await createIntegrationModule([AuthModule]);
    pipe = context.moduleRef.get(ActiveUserPipe);
    prisma = context.prisma;
    close = context.close;
  });

  afterAll(async () => {
    await close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  it('returns the current id and role from the database', async () => {
    const user = await createBuyer(prisma);

    await expect(
      pipe.transform({ id: user.id, role: 'BUYER' }),
    ).resolves.toEqual({ id: user.id, role: 'BUYER' });
  });

  it('uses the persisted role instead of the role in the token payload', async () => {
    const user = await createBuyer(prisma);
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ORGANIZER' },
    });

    await expect(
      pipe.transform({ id: user.id, role: 'BUYER' }),
    ).resolves.toEqual({ id: user.id, role: 'ORGANIZER' });
  });

  it('throws when the user no longer exists', async () => {
    await expect(
      pipe.transform({
        id: '00000000-0000-0000-0000-000000000000',
        role: 'BUYER',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
