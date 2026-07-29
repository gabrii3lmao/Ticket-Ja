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
    const {
      page = 1,
      limit = 10,
      city,
      state,
      name,
      startDate,
      endDate,
      sortOrder = 'desc',
      sortBy = 'createdAt',
    } = paginationDto;

    const skip = (page - 1) * limit;

    const orderBy = { [sortBy]: sortOrder };

    const venueFilter = {
      ...(city && { city: { contains: city, mode: 'insensitive' as const } }),
      ...(state && { state }),
    };

    const where = {
      ...(name && { name: { contains: name, mode: 'insensitive' as const } }),
      ...(Object.keys(venueFilter).length && { venue: venueFilter }),
      ...(startDate && { startDate: { gte: new Date(startDate) } }),
      ...(endDate && { endDate: { lte: new Date(endDate) } }),
    };

    const [events, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        skip,
        take: Number(limit),
        orderBy,
        include: { venue: true, categories: true },
        where,
      }),
      this.prisma.event.count({ where }),
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
