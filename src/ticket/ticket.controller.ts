import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { TicketService } from './ticket.service';
import { QueryTicketDto } from './dto/query-ticket.dto';
import {
  CurrentUser,
  type UserPayload,
} from 'src/auth/decorators/current-user.decorator';
import { ActiveUserPipe } from 'src/auth/pipes/active-user.pipe';
import { Role } from 'generated/prisma/enums';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('ticket')
@Controller('ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List current user tickets' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of tickets',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(
    @Query() queryDto: QueryTicketDto,
    @CurrentUser(ActiveUserPipe) user: UserPayload,
  ) {
    return this.ticketService.findAll(queryDto, user.id);
  }

  @ApiBearerAuth()
  @Get('/validate/:code')
  @ApiOperation({ summary: 'Validate a ticket by QR code' })
  @ApiParam({ name: 'code', description: 'Ticket code from QR scan' })
  @ApiResponse({ status: 200, description: 'Returns ticket validation info' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  validate(
    @Param('code') code: string,
    @CurrentUser(ActiveUserPipe) user: UserPayload,
  ) {
    return this.ticketService.validate(code, user);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a ticket by ID' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Returns the ticket' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Ticket not found or not yours' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser(ActiveUserPipe) user: UserPayload,
  ) {
    return this.ticketService.findOne(id, user);
  }

  @Patch(':id/use')
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark ticket as used' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket marked as used' })
  @ApiResponse({ status: 400, description: 'Ticket is not valid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Ticket not found or not yours' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  markAsUsed(
    @Param('id') id: string,
    @CurrentUser(ActiveUserPipe) user: UserPayload,
  ) {
    return this.ticketService.markAsUsed(id, user);
  }
}
