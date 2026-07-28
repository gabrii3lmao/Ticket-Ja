import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { venue: true, categories: true },
    });
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
        include: { venue: true, categories: true },
      }),
      this.prisma.event.count(),
    ]);

    return {
      data: events,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(
    id: string,
    userId: string,
    data: UpdateEventDto,
  ): Promise<Event> {
    const eventExist = await this.prisma.event.findUnique({ where: { id } });
    if (!eventExist || eventExist.organizerId !== userId) {
      throw new NotFoundException('Event not found or not yours');
    }
    return this.prisma.event.update({ where: { id }, data: { ...data } });
  }

  async delete(id: string, userId: string): Promise<Event> {
    const eventExist = await this.prisma.event.findUnique({ where: { id } });
    if (!eventExist || eventExist.organizerId !== userId) {
      throw new NotFoundException('Event not found or not yours');
    }

    const categoryCount = await this.prisma.category.count({
      where: { eventId: eventExist.id },
    });

    if (categoryCount > 0) {
      throw new BadRequestException(
        `Cannot delete event: ${categoryCount} category(ies) still associated`,
      );
    }
    return this.prisma.event.delete({ where: { id } });
  }
}
