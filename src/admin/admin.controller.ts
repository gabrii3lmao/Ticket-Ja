import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'generated/prisma/enums';
import { QueryOrganizerApplication } from './dto/query-organizer-application.dto';
import { RejectReasonDto } from './dto/rejected-reason.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('organizer-application')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List organizer applications' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated organizer applications',
  })
  listOrganizerSummary(@Query() query: QueryOrganizerApplication) {
    return this.adminService.listOrganizerApplications(query);
  }

  @Patch('organizer-application/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Approve an organizer application' })
  @ApiResponse({ status: 200, description: 'Organizer approved successfully' })
  @ApiResponse({ status: 400, description: 'Application is not pending' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  approveOrganizerApplication(@Param('id') id: string) {
    return this.adminService.approveOrganizerApplication(id);
  }

  @Patch('organizer-application/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reject an organizer application' })
  @ApiResponse({ status: 200, description: 'Organizer rejected successfully' })
  @ApiResponse({ status: 400, description: 'Application is not pending' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  rejectOrganizerApplication(
    @Param('id') id: string,
    @Body() rejectReason: RejectReasonDto,
  ) {
    return this.adminService.rejectOrganizerApplication(id, rejectReason);
  }

  @Get('payments-requests')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List orders pending payment confirmation' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated orders with optional status filter',
  })
  listOrders(@Query() query: QueryOrderDto) {
    return this.adminService.listOrders(query);
  }

  @Get('payments-requests/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get order detail with payment info' })
  @ApiResponse({ status: 200, description: 'Order details returned' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOrder(@Param('id') orderId: string) {
    return this.adminService.getOrderDetail(orderId);
  }

  @Patch('payments-requests/:id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Confirm payment for an order' })
  @ApiResponse({
    status: 200,
    description: 'Payment confirmed, order marked as PAID',
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  confirmPayment(@Param('id') orderId: string) {
    return this.adminService.confirmPayment(orderId);
  }

  @Patch('payments-requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reject payment for an order' })
  @ApiResponse({
    status: 200,
    description: 'Payment rejected, order canceled, stock released',
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  rejectPayment(@Param('id') orderId: string, @Body() dto: RejectPaymentDto) {
    return this.adminService.rejectPayment(orderId, dto.reason);
  }
}
