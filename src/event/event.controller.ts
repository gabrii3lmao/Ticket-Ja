import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { randomUUID } from 'crypto';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post('')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() data: CreateEventDto) {
    const temporaryUserId = randomUUID();
    return this.eventService.create(data, temporaryUserId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getById(@Param('id') id: string) {
    return this.eventService.findOne(id);
  }

  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  getAllByUserId(@Param('userId') userId: string) {
    return this.eventService.findManyByUserId(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.eventService.delete(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  update(@Param('id') id: string, @Body() data: UpdateEventDto) {
    return this.eventService.update(id, data);
  }
}
