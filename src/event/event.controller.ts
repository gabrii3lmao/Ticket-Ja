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
import { UpdateEventDto } from './dto/update-event.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post('')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() data: CreateEventDto, @CurrentUser() userId: string) {
    return this.eventService.create(data, userId);
  }

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getById(@Param('id') id: string) {
    return this.eventService.findOne(id);
  }

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  getAll() {
    return this.eventService.findAll();
  }

  @Get('')
  @HttpCode(HttpStatus.OK)
  getAllByUserId(@CurrentUser() userId: string) {
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
