import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Venue } from 'generated/prisma/client';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { QueryVenueDto } from './dto/query-venue.dto';

@Injectable()
export class VenueService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateVenueDto, userId: string): Promise<Venue> {
    const organizer = await this.getOrganizer(userId);
    return this.prisma.venue.create({
      data: { ...data, organizerProfileId: organizer.id },
    });
  }

  async findAll(query: QueryVenueDto) {
    const {
      page = 1,
      limit = 10,
      city,
      maxCapacity, // Corrigido o typo
      minCapacity, // Corrigido o typo
      name,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      state,
    } = query;
    const skip = (page - 1) * limit;

    const capacityFilter = {
      ...(minCapacity && { gte: Number(minCapacity) }),
      ...(maxCapacity && { lte: Number(maxCapacity) }),
    };

    const where = {
      ...(name && { name: { contains: name, mode: 'insensitive' as const } }),
      ...(city && { city: { contains: city, mode: 'insensitive' as const } }),
      ...(state && { state }),
      ...(Object.keys(capacityFilter).length && { capacity: capacityFilter }),
    };

    const [venues, total] = await this.prisma.$transaction([
      this.prisma.venue.findMany({
        skip,
        take: limit,
        where,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.venue.count({ where }),
    ]);

    return {
      data: venues,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<Venue> {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: { events: true },
    });
    if (!venue) {
      throw new NotFoundException('Venue with this ID not found');
    }
    return venue;
  }

  async update(
    id: string,
    userId: string,
    data: UpdateVenueDto,
  ): Promise<Venue> {
    const organizer = await this.getOrganizer(userId);
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue || venue.organizerProfileId !== organizer.id) {
      throw new ForbiddenException('Venue not found or not yours');
    }

    // validate Venue capacity
    if (data.capacity !== undefined) {
      const stockTotal = await this.prisma.category.aggregate({
        where: { event: { venueId: id } },
        _sum: { quantity: true },
      });
      const soldTotal = await this.prisma.orderItem.aggregate({
        where: { category: { event: { venueId: id } } },
        _sum: { quantity: true },
      });
      const allocated =
        (stockTotal._sum.quantity ?? 0) + (soldTotal._sum.quantity ?? 0);

      if (allocated > data.capacity) {
        throw new BadRequestException(
          `Cannot reduce capacity below allocated tickets (${allocated})`,
        );
      }
    }

    return this.prisma.venue.update({ where: { id }, data });
  }

  async delete(id: string, userId: string): Promise<Venue> {
    const organizer = await this.getOrganizer(userId);
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue || venue.organizerProfileId !== organizer.id) {
      throw new ForbiddenException('Venue not found or not yours');
    }

    const eventCount = await this.prisma.event.count({
      where: { venueId: id },
    });
    if (eventCount > 0) {
      throw new BadRequestException(
        `Cannot delete venue: ${eventCount} event(s) still associated`,
      );
    }
    return this.prisma.venue.delete({ where: { id } });
  }

  private async getOrganizer(userId: string) {
    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { userId },
    });

    if (!organizer) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return organizer;
  }
}
