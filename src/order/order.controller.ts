import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { ActiveUserPipe } from 'src/auth/pipes/active-user.pipe';

@ApiTags('order')
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Purchase tickets' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request or insufficient stock',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User or category not found' })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser(ActiveUserPipe) userId: string,
  ) {
    return this.orderService.create(dto, userId);
  }
}
