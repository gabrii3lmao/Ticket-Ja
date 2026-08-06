import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { Event, EventStatus } from 'generated/prisma/client';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventDto } from './dto/query-event.dto';
import { assertEndDateAfterStartDate } from 'src/common/validators/event.validator';

@Injectable()
export class EventService {
  private readonly ALLOWED_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
    DRAFT: ['PUBLISHED', 'CANCELED'],
    PUBLISHED: ['FINISHED', 'CANCELED'],
    FINISHED: ['CANCELED'],
    CANCELED: [],
  };
  constructor(private prisma: PrismaService) {}

  async create(data: CreateEventDto, userId: string): Promise<Event> {
    assertEndDateAfterStartDate(data.startDate, data.endDate);
    await this.validateVenueOwnership(data.venueId, userId);

    return this.prisma.event.create({
      data: { ...data, organizerId: userId },
    });
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
      status: EventStatus.PUBLISHED,
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
    const eventExist = await this.getOwnedEvent(id, userId);

    const startDate = data.startDate ?? eventExist.startDate;

    assertEndDateAfterStartDate(startDate, data.endDate);

    if (data.venueId) await this.validateVenueOwnership(data.venueId, userId);

    return this.prisma.event.update({ where: { id }, data: { ...data } });
  }

  async delete(id: string, userId: string): Promise<Event> {
    const eventExist = await this.getOwnedEvent(id, userId);
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

  async updateStatus(id: string, userId: string, status: EventStatus) {
    const event = await this.getOwnedEvent(id, userId);
    if (!this.ALLOWED_TRANSITIONS[event.status].includes(status)) {
      throw new BadRequestException(
        `Cannot transition event from ${event.status} to ${status}`,
      );
    }

    if (status === 'PUBLISHED') {
      const categoryCount = await this.prisma.category.count({
        where: { eventId: id },
      });
      if (categoryCount === 0) {
        throw new BadRequestException(
          'Cannot publish an event without at least one category',
        );
      }
    }

    return this.prisma.event.update({ where: { id }, data: { status } });
  }

  private async getOwnedEvent(id: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event || event.organizerId !== userId) {
      throw new NotFoundException('Event not found or not yours');
    }
    return event;
  }

  private async validateVenueOwnership(venueId: string, userId: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
    });

    if (!venue) throw new NotFoundException('Venue not found');

    if (venue.organizerId !== userId) {
      throw new ForbiddenException('Venue not found or not yours');
    }

    return venue;
  }
}
