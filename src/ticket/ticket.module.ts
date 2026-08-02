import { Module } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { UserModule } from 'src/user/user.module';

@Module({
  controllers: [TicketController],
  providers: [TicketService],
  imports: [UserModule],
})
export class TicketModule {}
