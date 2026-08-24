import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma.service';
import { QueryCategoryDto } from './dto/query-category.dto';
import { assertSalesWindow } from 'src/common/validators/event.validator';
import { UserPayload } from 'src/auth/decorators/current-user.decorator';
import { Role } from 'generated/prisma/enums';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateCategoryDto, eventId: string, user: UserPayload) {
    const event = await this.getOwnedEvent(eventId, user);
    // Category stock cannot exceed venue capacity
    const stockTotal = await this.prisma.category.aggregate({
      where: { eventId },
      _sum: { quantity: true },
    });

    const soldTotal = await this.prisma.orderItem.aggregate({
      where: { category: { eventId } },
      _sum: { quantity: true },
    });

    const allocated =
      (stockTotal._sum.quantity ?? 0) + (soldTotal._sum.quantity ?? 0);

    if (allocated + data.quantity > event.venue.capacity) {
      throw new BadRequestException(
        `Total tickets (${allocated + data.quantity}) exceeds venue capacity (${event.venue.capacity})`,
      );
    }

    // Date validation
    assertSalesWindow(data.salesStart, data.salesEnd, event.startDate);

    return this.prisma.category.create({ data: { ...data, eventId } });
  }

  async findAll(query: QueryCategoryDto, eventId: string) {
    const {
      page = 1,
      limit = 10,
      name,
      maxPrice,
      minPrice,
      salesEndDate,
      salesStartDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CategoryWhereInput = {
      eventId,
      name: name ? { contains: name, mode: 'insensitive' } : undefined,
      price:
        minPrice !== undefined || maxPrice !== undefined
          ? {
              gte: minPrice,
              lte: maxPrice,
            }
          : undefined,

      salesStart: salesStartDate
        ? { gte: new Date(salesStartDate) }
        : undefined,
      salesEnd: salesEndDate ? { lte: new Date(salesEndDate) } : undefined,
    };

    const orderBy = { [sortBy]: sortOrder };

    const [categories, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        skip,
        take: limit,
        orderBy,
        where,
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      data: categories,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, event: { status: 'PUBLISHED' } },
      include: { event: true },
    });
    if (!category) {
      throw new NotFoundException('Category with this ID not found');
    }

    return category;
  }

  async update(id: string, user: UserPayload, data: UpdateCategoryDto) {
    const categoryExist = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!categoryExist) {
      throw new NotFoundException('Category with this ID not found');
    }

    const event = await this.getOwnedEvent(categoryExist.eventId, user);

    // Date validation
    assertSalesWindow(data.salesStart, data.salesEnd, event.startDate);

    // Category stock cannot exceed venue capacity
    const stockTotal = await this.prisma.category.aggregate({
      where: { eventId: event.id },
      _sum: { quantity: true },
    });

    const soldTotal = await this.prisma.orderItem.aggregate({
      where: { category: { eventId: event.id } },
      _sum: { quantity: true },
    });

    const allocated =
      (stockTotal._sum.quantity ?? 0) + (soldTotal._sum.quantity ?? 0);

    if (data.quantity !== undefined) {
      const newAllocated = allocated - categoryExist.quantity + data.quantity;
      if (newAllocated > event.venue.capacity) {
        throw new BadRequestException(
          `Total tickets (${newAllocated}) exceeds venue capacity (${event.venue.capacity})`,
        );
      }
    }

    return this.prisma.category.update({
      data: { ...data },
      where: { id },
    });
  }

  async remove(id: string, user: UserPayload) {
    const categoryExist = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!categoryExist) {
      throw new NotFoundException('Category with this ID not found');
    }

    await this.getOwnedEvent(categoryExist.eventId, user);

    const orderCount = await this.prisma.orderItem.count({
      where: { categoryId: id },
    });

    if (orderCount > 0) {
      throw new BadRequestException(
        `Cannot delete category: ${orderCount} order item(s) still associated`,
      );
    }

    return this.prisma.category.delete({ where: { id } });
  }

  private async getOwnedEvent(eventId: string, user: UserPayload) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { organizerProfile: true, venue: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (user.role !== Role.ADMIN && event.organizerProfile.userId !== user.id) {
      throw new ForbiddenException('Event not found or not yours');
    }

    return event;
  }
}
