import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import {
  CurrentUser,
  type UserPayload,
} from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'generated/prisma/enums';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { QueryCouponDto } from './dto/query-coupon.dto';

@Controller('event/:eventId/coupon')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Roles(Role.ADMIN, Role.ORGANIZER)
  @Post('')
  create(
    @Body() data: CreateCouponDto,
    @Param('eventId') eventId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.couponService.create(eventId, user, data);
  }

  @Roles(Role.ADMIN, Role.ORGANIZER)
  @Patch(':id')
  update(
    @Body() data: UpdateCouponDto,
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.couponService.update(id, eventId, user, data);
  }

  @Roles(Role.ADMIN, Role.ORGANIZER)
  @Get('')
  listAll(
    @Query() query: QueryCouponDto,
    @CurrentUser() user: UserPayload,
    @Param('eventId') eventId: string,
  ) {
    return this.couponService.getAll(user, eventId, query);
  }

  @Roles(Role.ADMIN, Role.ORGANIZER)
  @Get(':id')
  getOne(
    @CurrentUser() user: UserPayload,
    @Param('eventId') eventId: string,
    @Param('id') id: string,
  ) {
    return this.couponService.getOne(user, eventId, id);
  }

  @Delete(':id')
  delete(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
    @Param('eventId') eventId: string,
  ) {
    return this.couponService.delete(id, eventId, user);
  }
}
