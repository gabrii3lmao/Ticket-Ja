import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import {
  CurrentUser,
  type UserPayload,
} from 'src/auth/decorators/current-user.decorator';
import { Public } from 'src/auth/decorators/public.decorator';
import { ActiveUserPipe } from 'src/auth/pipes/active-user.pipe';
import { QueryEventDto } from './dto/query-event.dto';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'generated/prisma/enums';

@ApiTags('event')
@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  create(
    @Body() data: CreateEventDto,
    @CurrentUser(ActiveUserPipe) user: UserPayload,
  ) {
    return this.eventService.create(data, user);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all events' })
  @ApiResponse({ status: 200, description: 'Returns list of events' })
  getAll(@Query() paginationDto: QueryEventDto) {
    return this.eventService.findAll(paginationDto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiResponse({ status: 200, description: 'Returns the event' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  getById(@Param('id') id: string) {
    return this.eventService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @ApiOperation({ summary: 'Delete an event' })
  @ApiResponse({ status: 204, description: 'Event deleted successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  delete(
    @Param('id') id: string,
    @CurrentUser(ActiveUserPipe) user: UserPayload,
  ) {
    return this.eventService.delete(id, user);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @ApiOperation({ summary: 'Update an event' })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  update(
    @Param('id') id: string,
    @Body() data: UpdateEventDto,
    @CurrentUser(ActiveUserPipe) user: UserPayload,
  ) {
    return this.eventService.update(id, user, data);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @ApiOperation({ summary: 'Update event status' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEventStatusDto,
    @CurrentUser(ActiveUserPipe) user: UserPayload,
  ) {
    return this.eventService.updateStatus(id, user, dto.status);
  }
}
