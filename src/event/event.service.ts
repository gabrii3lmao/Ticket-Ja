import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { Event } from 'generated/prisma/client';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventDto } from './dto/query-event.dto';

@Injectable()
export class EventService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateEventDto, userId: string): Promise<Event> {
    return this.prisma.event.create({ data: { ...data, organizerId: userId } });
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException('Event with this ID not found');
    }

    return event;
  }

  async findAll(paginationDto: QueryEventDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [events, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.event.count(),
    ]);

    return {
      data: events,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(id: string, data: UpdateEventDto): Promise<Event> {
    const eventExist = await this.prisma.event.findUnique({ where: { id } });
    if (!eventExist) {
      throw new NotFoundException('Event with this ID not found');
    }
    return this.prisma.event.update({ where: { id }, data: { ...data } });
  }

  async delete(id: string): Promise<Event> {
    const eventExist = await this.prisma.event.findUnique({ where: { id } });
    if (!eventExist) {
      throw new NotFoundException('Event with this ID not found');
    }
    return this.prisma.event.delete({ where: { id } });
  }
}
