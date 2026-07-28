import { Module } from '@nestjs/common';
import { VenueService } from './venue.service';
import { VenueController } from './venue.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [VenueController],
  providers: [VenueService, PrismaService],
  exports: [VenueService],
})
export class VenueModule {}
