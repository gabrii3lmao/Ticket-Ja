import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  CurrentUser,
  type UserPayload,
} from 'src/auth/decorators/current-user.decorator';
import { ActiveUserPipe } from 'src/auth/pipes/active-user.pipe';
import { Throttle } from '@nestjs/throttler';

@ApiTags('order')
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiBearerAuth()
  @Throttle({ medium: { limit: 5, ttl: 10000 } })
  @ApiOperation({ summary: 'Purchase tickets' })
  @ApiResponse({
    status: 201,
    description:
      'Order created successfully with payment in PENDING status awaiting admin confirmation',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request or insufficient stock',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User or category not found' })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser(ActiveUserPipe) user: UserPayload,
  ) {
    return this.orderService.create(dto, user.id);
  }
}
