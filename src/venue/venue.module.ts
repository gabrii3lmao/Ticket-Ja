import { Module } from '@nestjs/common';
import { VenueService } from './venue.service';
import { VenueController } from './venue.controller';
import { UserModule } from 'src/user/user.module';

@Module({
  controllers: [VenueController],
  providers: [VenueService],
  imports: [UserModule],
  exports: [VenueService],
})
export class VenueModule {}
