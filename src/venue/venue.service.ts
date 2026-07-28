import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Venue } from 'generated/prisma/client';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { QueryVenueDto } from './dto/query-venue.dto';

@Injectable()
export class VenueService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateVenueDto): Promise<Venue> {
    return this.prisma.venue.create({ data });
  }

  async findAll(query: QueryVenueDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [venues, total] = await this.prisma.$transaction([
      this.prisma.venue.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.venue.count(),
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

  async update(id: string, data: UpdateVenueDto): Promise<Venue> {
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue) {
      throw new NotFoundException('Venue with this ID not found');
    }
    return this.prisma.venue.update({ where: { id }, data });
  }

  async delete(id: string): Promise<Venue> {
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue) {
      throw new NotFoundException('Venue with this ID not found');
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
}
