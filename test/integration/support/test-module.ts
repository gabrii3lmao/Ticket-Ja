import { ModuleMetadata } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from 'src/prisma.module';
import { PrismaService } from 'src/prisma.service';

export interface IntegrationContext {
  moduleRef: TestingModule;
  prisma: PrismaService;
  close: () => Promise<void>;
}

/**
 * Builds a Nest testing module with the real Prisma client and only the
 * feature modules required by each integration suite.
 */
export async function createIntegrationModule(
  imports: NonNullable<ModuleMetadata['imports']> = [],
): Promise<IntegrationContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      PrismaModule,
      ...imports,
    ],
  }).compile();

  const prisma = moduleRef.get(PrismaService);

  return {
    moduleRef,
    prisma,
    close: async () => {
      await prisma.$disconnect().catch(() => undefined);
      await moduleRef.close();
    },
  };
}
