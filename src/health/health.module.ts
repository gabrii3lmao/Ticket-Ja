import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [HealthController],
  imports: [TerminusModule],
  providers: [PrismaService],
})
export class HealthModule {}
