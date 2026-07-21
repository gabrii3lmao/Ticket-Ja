import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { PrismaService } from 'src/prisma.service';
import { UserModule } from 'src/user/user.module';

@Module({
  controllers: [EventController],
  providers: [EventService, PrismaService],
  exports: [EventService],
  imports: [UserModule],
})
export class EventModule {}
